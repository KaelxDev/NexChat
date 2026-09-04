from contextlib import asynccontextmanager
from pathlib import Path
import json

from anyio import to_thread
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from app.auth import get_user_from_token
from app.database import close_db_pool, init_db_pool, initialize_database
from app.moderation_bot import BOT_USER, is_moderator, moderation_bot
from app.moderation_store import clear_recent_messages
from app.routes.auth import router as auth_router
from app.routes.messages import router as messages_router
from app.security import ALLOWED_ORIGINS, POKINEX_VERCEL_ORIGIN, is_allowed_origin
from app.websocket.chat import manager
from app.websocket.direct_message_features import (
    delete_direct,
    edit_direct,
    react_direct,
    send_direct_message,
)
from app.websocket.schemas import (
    ChatMessageEvent,
    DeleteMessageEvent,
    DirectMessageDeleteEvent,
    DirectMessageEditEvent,
    DirectMessageEvent,
    DirectMessageReactionEvent,
    EditMessageEvent,
    ReactionEvent,
)

APP_DIR = Path(__file__).resolve().parent
MEDIA_DIR = APP_DIR / "uploads"
AVATAR_DIR = MEDIA_DIR / "avatars"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)
MAX_WEBSOCKET_PAYLOAD = 16 * 1024


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await to_thread.run_sync(init_db_pool)
    await to_thread.run_sync(initialize_database)
    try:
        yield
    finally:
        await to_thread.run_sync(close_db_pool)


app = FastAPI(title="NexChat API", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(ALLOWED_ORIGINS),
    allow_origin_regex=POKINEX_VERCEL_ORIGIN.pattern,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")
app.include_router(auth_router)
app.include_router(messages_router)


@app.get("/")
async def root():
    return {"message": "NexChat API", "status": "online"}


def _websocket_token(websocket: WebSocket) -> str | None:
    return websocket.cookies.get("session")


async def _validate_websocket_origin(websocket: WebSocket) -> bool:
    origin = websocket.headers.get("origin")
    if is_allowed_origin(origin):
        return True
    await websocket.close(code=1008, reason="Origin not allowed")
    return False


async def _send_validation_error(websocket: WebSocket, action: str, error: ValidationError) -> None:
    first_error = error.errors()[0] if error.errors() else {}
    messages = {
        "string_too_long": "Um dos campos excedeu o limite permitido.",
        "string_too_short": "Um dos campos é muito curto.",
        "literal_error": "Valor não permitido.",
        "missing": "Campo obrigatório ausente.",
        "string_type": "Campo de texto inválido.",
        "greater_than": "Identificador inválido.",
    }
    await websocket.send_json({
        "type": "error",
        "action": action,
        "message": messages.get(first_error.get("type"), "Dados do evento inválidos."),
    })


async def _send_users_with_bot():
    users = [{
        "id": BOT_USER["id"],
        "username": BOT_USER["username"],
        "displayName": BOT_USER["displayName"],
        "avatar": BOT_USER["avatar"],
        "status": BOT_USER["status"],
        "online": True,
        "role": "bot",
    }]
    seen = {BOT_USER["id"]}

    for user in manager.active_connections.values():
        if user["id"] in seen:
            continue
        seen.add(user["id"])
        users.append({
            "id": user["id"],
            "username": user["username"],
            "displayName": user["displayName"],
            "avatar": user["avatar"],
            "status": user["status"],
            "online": True,
            "role": "user",
        })
    await manager.broadcast({"type": "users", "users": users})


@app.websocket("/ws")
async def websocket_chat(websocket: WebSocket):
    if not await _validate_websocket_origin(websocket):
        return

    token = _websocket_token(websocket)
    user = await to_thread.run_sync(get_user_from_token, token)
    if not user:
        await websocket.close(code=1008, reason="Authentication required")
        return

    await manager.connect(websocket, user)
    await _send_users_with_bot()

    try:
        while True:
            raw = await websocket.receive_text()
            if len(raw.encode("utf-8")) > MAX_WEBSOCKET_PAYLOAD:
                await websocket.send_json({"type": "error", "message": "Mensagem excede o limite permitido."})
                continue

            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "JSON inválido."})
                continue

            action = payload.get("type")
            try:
                if action == "message":
                    event = ChatMessageEvent.model_validate(payload)
                    created = await to_thread.run_sync(
                        manager.handle_message,
                        user,
                        event.content,
                        event.reply_to_id,
                    )
                    if created:
                        await manager.broadcast(created)
                        clear_recent_messages(created.get("id"))
                elif action == "edit_message":
                    event = EditMessageEvent.model_validate(payload)
                    updated = await to_thread.run_sync(manager.edit_message, user, event.message_id, event.content)
                    if updated:
                        await manager.broadcast(updated)
                elif action == "delete_message":
                    event = DeleteMessageEvent.model_validate(payload)
                    deleted = await to_thread.run_sync(manager.delete_message, user, event.message_id)
                    if deleted:
                        await manager.broadcast(deleted)
                elif action == "react_message":
                    event = ReactionEvent.model_validate(payload)
                    updated = await to_thread.run_sync(manager.react_message, user, event.message_id, event.emoji)
                    if updated:
                        await manager.broadcast(updated)
                elif action == "direct_message":
                    event = DirectMessageEvent.model_validate(payload)
                    created = await to_thread.run_sync(
                        send_direct_message,
                        user["id"],
                        event.recipient_id,
                        event.content,
                        event.reply_to_id,
                    )
                    if created:
                        await manager.send_to_user(
                            event.recipient_id,
                            {**created, "notifyRecipient": True},
                        )
                        await manager.send_to_user(
                            user["id"],
                            {**created, "notifyRecipient": False},
                        )
                elif action == "direct_message_edit":
                    event = DirectMessageEditEvent.model_validate(payload)
                    updated = await to_thread.run_sync(
                        edit_direct,
                        user["id"],
                        event.message_id,
                        event.content,
                    )
                    if updated:
                        await manager.send_to_user(updated["senderId"], updated)
                        await manager.send_to_user(updated["recipientId"], updated)
                elif action == "direct_message_delete":
                    event = DirectMessageDeleteEvent.model_validate(payload)
                    deleted = await to_thread.run_sync(delete_direct, user["id"], event.message_id)
                    if deleted:
                        await manager.send_to_user(deleted["senderId"], deleted)
                        await manager.send_to_user(deleted["recipientId"], deleted)
                elif action == "direct_message_reaction":
                    event = DirectMessageReactionEvent.model_validate(payload)
                    updated = await to_thread.run_sync(
                        react_direct,
                        user["id"],
                        event.message_id,
                        event.emoji,
                    )
                    if updated:
                        await manager.send_to_user(updated["senderId"], updated)
                        await manager.send_to_user(updated["recipientId"], updated)
                elif action == "ping":
                    await websocket.send_json({"type": "pong"})
                else:
                    await websocket.send_json({"type": "error", "message": "Ação desconhecida."})
            except ValidationError as exc:
                await _send_validation_error(websocket, action or "unknown", exc)
            except ValueError as exc:
                await websocket.send_json({"type": "error", "action": action, "message": str(exc)})
    except WebSocketDisconnect:
        manager.disconnect(websocket, user)
        await _send_users_with_bot()
