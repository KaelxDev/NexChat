from anyio import to_thread

from app.auth import get_user_by_id
from app.database import _persistent_avatar_reference, get_connection, using_postgres
from app.direct_messages import (
    delete_direct_message,
    edit_direct_message,
    toggle_direct_reaction,
)
from app.direct_messages import save_direct_message as legacy_save_direct_message


def _pair_users(manager, sender_id, recipient_id):
    participants = {int(sender_id), int(recipient_id)}
    return [
        (websocket, current)
        for websocket, current in list(manager.active_connections.items())
        if int(current["id"]) in participants
    ]


def _direct_message_payload(message_id):
    connection = get_connection()
    try:
        p = "%s" if using_postgres() else "?"
        row = connection.execute(
            f"""
            SELECT dm.message_id, dm.sender_id, dm.recipient_id, dm.message,
                   dm.created_at, dm.edited_at, dm.deleted_at,
                   su.username AS sender_username, su.display_name AS sender_display_name, su.avatar AS sender_avatar,
                   ru.username AS recipient_username, ru.display_name AS recipient_display_name, ru.avatar AS recipient_avatar
            FROM direct_messages dm
            JOIN users su ON su.id = dm.sender_id
            JOIN users ru ON ru.id = dm.recipient_id
            WHERE dm.message_id = {p}
            """,
            (message_id,),
        ).fetchone()
        if not row:
            return None
        return {
            "messageId": row["message_id"],
            "senderId": row["sender_id"],
            "recipientId": row["recipient_id"],
            "userId": row["sender_id"],
            "username": row["sender_username"],
            "displayName": row["sender_display_name"],
            "avatar": _persistent_avatar_reference(connection, row["sender_id"], row["sender_avatar"]),
            "recipientUsername": row["recipient_username"],
            "recipientDisplayName": row["recipient_display_name"],
            "recipientAvatar": _persistent_avatar_reference(connection, row["recipient_id"], row["recipient_avatar"]),
            "message": "Esta mensagem foi excluída" if row["deleted_at"] else row["message"],
            "timestamp": row["created_at"],
            "edited": bool(row["edited_at"]),
            "editedAt": row["edited_at"],
            "deleted": bool(row["deleted_at"]),
            "deletedAt": row["deleted_at"],
            "deliveryStatus": "sent",
            "offline": False,
        }
    finally:
        connection.close()


async def send_direct_message(manager, sender_user, recipient_id, message, message_id, sender, reply_to_message_id=None):
    recipient_id = int(recipient_id)
    if recipient_id == int(sender_user["id"]):
        await sender.send_json({"type": "error", "action": "direct_message", "message": "Você não pode iniciar uma conversa privada consigo mesmo."})
        return
    recipient_user = await to_thread.run_sync(get_user_by_id, recipient_id)
    if not recipient_user:
        await sender.send_json({"type": "error", "action": "direct_message", "message": "Usuário não encontrado."})
        return

    timestamp = manager.get_timestamp()
    if message_id:
        try:
            from app.direct_messages import save_direct_message
            await to_thread.run_sync(save_direct_message, message_id, sender_user["id"], recipient_id, message, timestamp, reply_to_message_id)
        except TypeError:
            await to_thread.run_sync(legacy_save_direct_message, message_id, sender_user["id"], recipient_id, message, timestamp)
        except Exception:
            await sender.send_json({"type": "error", "action": "direct_message", "message": "Não foi possível salvar a mensagem privada."})
            return

    event = {
        "type": "direct_message",
        "messageId": message_id,
        "senderId": sender_user["id"],
        "recipientId": recipient_id,
        "userId": sender_user["id"],
        "username": sender_user["username"],
        "displayName": sender_user["displayName"],
        "avatar": sender_user.get("avatar", ""),
        "recipientUsername": recipient_user["username"],
        "recipientDisplayName": recipient_user["displayName"],
        "recipientAvatar": recipient_user.get("avatar", ""),
        "message": message,
        "timestamp": timestamp,
        "deliveryStatus": "sent",
        "offline": False,
        "edited": False,
        "deleted": False,
    }
    if reply_to_message_id:
        reply = await to_thread.run_sync(_direct_message_payload, reply_to_message_id)
        if reply:
            event["replyTo"] = {
                "messageId": reply["messageId"],
                "username": reply["username"],
                "displayName": reply["displayName"],
                "avatar": reply["avatar"],
                "message": reply["message"],
                "deleted": reply["deleted"],
            }

    for websocket, _current in _pair_users(manager, sender_user["id"], recipient_id):
        try:
            await websocket.send_json(event)
        except Exception:
            manager.active_connections.pop(websocket, None)

    if sender and message_id:
        await sender.send_json({"type": "direct_ack", "messageId": message_id})


async def _send_to_pair(manager, data, sender_id, recipient_id):
    for websocket, _current in _pair_users(manager, sender_id, recipient_id):
        try:
            await websocket.send_json(data)
        except Exception:
            manager.active_connections.pop(websocket, None)


async def edit_direct(manager, user, message_id, message, sender):
    updated = await to_thread.run_sync(edit_direct_message, message_id, int(user["id"]), message, manager.get_timestamp())
    if not updated:
        await sender.send_json({"type": "error", "action": "direct_message_edit", "messageId": message_id, "message": "Mensagem privada não encontrada ou você não é o autor."})
        return
    event = {"type": "direct_message_edited", **(await to_thread.run_sync(_direct_message_payload, message_id))}
    await _send_to_pair(manager, event, updated["sender_id"], updated["recipient_id"])


async def delete_direct(manager, user, message_id, sender):
    deleted = await to_thread.run_sync(delete_direct_message, message_id, int(user["id"]), manager.get_timestamp())
    if not deleted:
        await sender.send_json({"type": "error", "action": "direct_message_delete", "messageId": message_id, "message": "Mensagem privada não encontrada ou você não é o autor."})
        return
    event = {"type": "direct_message_deleted", **(await to_thread.run_sync(_direct_message_payload, message_id))}
    await _send_to_pair(manager, event, deleted["sender_id"], deleted["recipient_id"])


async def react_direct(manager, user, message_id, reaction, sender):
    payload = await to_thread.run_sync(_direct_message_payload, message_id)
    if not payload:
        await sender.send_json({"type": "error", "action": "direct_message_reaction", "messageId": message_id, "message": "Mensagem privada não encontrada."})
        return
    if payload["deleted"]:
        await sender.send_json({"type": "error", "action": "direct_message_reaction", "messageId": message_id, "message": "Não é possível reagir a uma mensagem excluída."})
        return
    active, reactions = await to_thread.run_sync(toggle_direct_reaction, message_id, int(user["id"]), reaction, manager.get_timestamp())
    event = {"type": "direct_message_reaction", "messageId": message_id, "reaction": reaction, "userId": user["id"], "active": bool(active), "reactions": reactions}
    await _send_to_pair(manager, event, payload["senderId"], payload["recipientId"])
