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
from app.moderation_bot import BOT_USER, moderation_bot
from app.routes.auth import router as auth_router
from app.routes.messages import router as messages_router
from app.security import ALLOWED_ORIGINS, is_allowed_origin
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
        })

    await manager.broadcast({
        "type": "users",
        "users": users,
        "timestamp": manager.get_timestamp(),
    })


async def _send_bot_message(message: str):
    manager.sequence += 1
    await manager.broadcast({
        "type": "message",
        "messageId": None,
        "userId": BOT_USER["id"],
        "username": BOT_USER["username"],
        "displayName": BOT_USER["displayName"],
        "avatar": BOT_USER["avatar"],
        "status": BOT_USER["status"],
        "message": message,
        "timestamp": manager.get_timestamp(),
        "sequence": manager.sequence,
    })


manager.send_users = _send_users_with_bot


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    if not await _validate_websocket_origin(websocket):
        return

    user = await to_thread.run_sync(get_user_from_token, _websocket_token(websocket))
    if not user:
        await websocket.close(code=1008, reason="Authentication required")
        return

    await manager.connect(websocket, user)
    try:
        while True:
            raw_data = await websocket.receive_text()
            if len(raw_data.encode("utf-8")) > MAX_WEBSOCKET_PAYLOAD:
                await websocket.send_json({"type": "error", "action": "payload", "message": "Evento muito grande."})
                continue
            try:
                data = json.loads(raw_data)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "action": "payload", "message": "JSON inválido."})
                continue
            if not isinstance(data, dict):
                await websocket.send_json({"type": "error", "action": "payload", "message": "O evento deve ser um objeto JSON."})
                continue

            event_type = data.get("type", "message")
            if event_type == "message":
                try:
                    event = ChatMessageEvent.model_validate(data)
                except ValidationError as error:
                    await _send_validation_error(websocket, "message", error)
                    continue
                message = event.message.strip()
                if message:
                    command_response = moderation_bot.command(message)
                    if command_response:
                        await _send_bot_message(command_response)
                        if event.messageId:
                            await websocket.send_json({"type": "ack", "messageId": event.messageId})
                        continue

                    moderation = moderation_bot.moderate(message)
                    if not moderation.allowed:
                        await websocket.send_json({
                            "type": "moderation",
                            "action": "blocked",
                            "message": moderation.reason,
                        })
                        if moderation.bot_message:
                            await _send_bot_message(moderation.bot_message)
                        if event.messageId:
                            await websocket.send_json({"type": "ack", "messageId": event.messageId})
                        continue

                    await manager.send_message(user, message, event.messageId, websocket, event.replyTo)
                continue

            if event_type == "direct_message":
                try:
                    event = DirectMessageEvent.model_validate(data)
                except ValidationError as error:
                    await _send_validation_error(websocket, "direct_message", error)
                    continue
                message = event.message.strip()
                if message:
                    await send_direct_message(manager, user, event.recipientId, message, event.messageId, websocket, event.replyTo)
                continue

            if event_type == "direct_message_edit":
                try:
                    event = DirectMessageEditEvent.model_validate(data)
                except ValidationError as error:
                    await _send_validation_error(websocket, "direct_message_edit", error)
                    continue
                message = event.message.strip()
                if message:
                    await edit_direct(manager, user, event.messageId, message, websocket)
                continue

            if event_type == "direct_message_delete":
                try:
                    event = DirectMessageDeleteEvent.model_validate(data)
                except ValidationError as error:
                    await _send_validation_error(websocket, "direct_message_delete", error)
                    continue
                await delete_direct(manager, user, event.messageId, websocket)
                continue

            if event_type == "direct_message_reaction":
                try:
                    event = DirectMessageReactionEvent.model_validate(data)
                except ValidationError as error:
                    await _send_validation_error(websocket, "direct_message_reaction", error)
                    continue
                await react_direct(manager, user, event.messageId, event.reaction, websocket)
                continue

            if event_type == "edit_message":
                try:
                    event = EditMessageEvent.model_validate(data)
                except ValidationError as error:
                    await _send_validation_error(websocket, "edit_message", error)
                    continue
                message = event.message.strip()
                if not message:
                    await websocket.send_json({"type": "error", "action": "edit_message", "messageId": event.messageId, "message": "A mensagem não pode ficar vazia."})
                    continue
                await manager.edit_message(user, event.messageId, message, websocket)
                continue

            if event_type == "delete_message":
                try:
                    event = DeleteMessageEvent.model_validate(data)
                except ValidationError as error:
                    await _send_validation_error(websocket, "delete_message", error)
                    continue
                await manager.delete_message(user, event.messageId, websocket)
                continue

            if event_type == "reaction":
                try:
                    event = ReactionEvent.model_validate(data)
                except ValidationError as error:
                    await _send_validation_error(websocket, "reaction", error)
                    continue
                await manager.toggle_reaction(user, event.messageId, event.reaction, websocket)
                continue

            await websocket.send_json({"type": "error", "action": "unknown_event", "message": "Tipo de evento não suportado."})

    except WebSocketDisconnect:
        disconnected_user = manager.disconnect(websocket)
        if disconnected_user:
            await manager.broadcast({
                "type": "system",
                "event": "user_left",
                "userId": disconnected_user["id"],
                "username": disconnected_user["username"],
                "displayName": disconnected_user["displayName"],
                "avatar": disconnected_user["avatar"],
                "message": f"{disconnected_user['username']} saiu do chat.",
                "timestamp": manager.get_timestamp(),
            })
            await manager.send_users()
