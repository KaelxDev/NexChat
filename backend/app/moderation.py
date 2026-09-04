"""Moderation helpers for the public general channel."""

from app.database import get_connection, using_postgres

GENERAL_CHANNEL = "general"


def clear_general_messages() -> int:
    """Permanently remove public-channel messages and their reactions.

    Direct messages are stored separately and are intentionally untouched.
    """
    connection = get_connection()
    try:
        placeholder = "%s" if using_postgres() else "?"
        if using_postgres():
            cursor = connection.execute(
                "DELETE FROM message_reactions WHERE message_id IN (SELECT message_id FROM messages)"
            )
        else:
            cursor = connection.execute(
                "DELETE FROM message_reactions WHERE message_id IN (SELECT message_id FROM messages)"
            )
        connection.execute("DELETE FROM messages")
        connection.commit()
        return cursor.rowcount
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
