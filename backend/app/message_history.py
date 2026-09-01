from app.database import get_connection, using_postgres

MAX_HISTORY_LIMIT = 100


def get_message_history(limit: int = 50, before: str | None = None) -> dict:
    limit = max(1, min(int(limit), MAX_HISTORY_LIMIT))
    connection = get_connection()

    try:
        placeholder = "%s" if using_postgres() else "?"
        before_clause = f" AND m.created_at < {placeholder}" if before else ""
        limit_placeholder = "%s" if using_postgres() else "?"

        query = f"""
            SELECT
                m.message_id,
                m.user_id,
                m.message,
                m.created_at,
                m.edited_at,
                m.deleted_at,
                m.reply_to_message_id,
                u.username,
                u.display_name,
                u.avatar,
                r.message_id AS reply_message_id,
                r.message AS reply_message,
                r.deleted_at AS reply_deleted_at,
                ru.username AS reply_username,
                ru.display_name AS reply_display_name,
                ru.avatar AS reply_avatar
            FROM messages m
            JOIN users u ON u.id = m.user_id
            LEFT JOIN messages r ON r.message_id = m.reply_to_message_id
            LEFT JOIN users ru ON ru.id = r.user_id
            WHERE 1 = 1
            {before_clause}
            ORDER BY m.created_at DESC, m.message_id DESC
            LIMIT {limit_placeholder}
        """

        params = []
        if before:
            params.append(before)
        params.append(limit + 1)

        rows = connection.execute(query, tuple(params)).fetchall()
        has_more = len(rows) > limit
        rows = rows[:limit]

        if not rows:
            return {"messages": [], "hasMore": False, "nextBefore": None}

        message_ids = [row["message_id"] for row in rows]
        reaction_placeholders = ", ".join(placeholder for _ in message_ids)
        reactions_query = f"""
            SELECT message_id, reaction, COUNT(*) AS count
            FROM message_reactions
            WHERE message_id IN ({reaction_placeholders})
            GROUP BY message_id, reaction
        """
        reaction_rows = connection.execute(reactions_query, tuple(message_ids)).fetchall()

        reactions_by_message = {}
        for row in reaction_rows:
            reactions_by_message.setdefault(row["message_id"], {})[row["reaction"]] = int(row["count"])

        messages = []
        for row in reversed(rows):
            item = {
                "type": "message",
                "messageId": row["message_id"],
                "userId": row["user_id"],
                "username": row["username"],
                "displayName": row["display_name"],
                "avatar": row["avatar"],
                "message": "Esta mensagem foi excluída" if row["deleted_at"] else row["message"],
                "timestamp": row["created_at"],
                "edited": bool(row["edited_at"]),
                "editedAt": row["edited_at"],
                "deleted": bool(row["deleted_at"]),
                "deletedAt": row["deleted_at"],
                "reactions": reactions_by_message.get(row["message_id"], {}),
                "deliveryStatus": "sent",
                "offline": False,
            }

            if row["reply_message_id"]:
                item["replyTo"] = {
                    "messageId": row["reply_message_id"],
                    "userId": row["reply_message_id"],
                    "username": row["reply_username"],
                    "displayName": row["reply_display_name"],
                    "avatar": row["reply_avatar"],
                    "message": "Esta mensagem foi excluída"
                    if row["reply_deleted_at"]
                    else row["reply_message"],
                    "deleted": bool(row["reply_deleted_at"]),
                }

            messages.append(item)

        return {
            "messages": messages,
            "hasMore": has_more,
            "nextBefore": messages[0]["timestamp"] if has_more else None,
        }
    finally:
        connection.close()
