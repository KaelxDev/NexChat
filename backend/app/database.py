from pathlib import Path
import os
import sqlite3

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
BASE_DIR = Path(__file__).resolve().parent.parent
SQLITE_DB_PATH = BASE_DIR / "poknex.db"


def using_postgres() -> bool:
    return bool(DATABASE_URL)


def get_connection():
    if using_postgres():
        import psycopg
        from psycopg.rows import dict_row

        return psycopg.connect(DATABASE_URL, row_factory=dict_row)

    connection = sqlite3.connect(SQLITE_DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    connection = get_connection()
    try:
        if using_postgres():
            connection.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id BIGSERIAL PRIMARY KEY,
                    username TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    password_salt TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    avatar TEXT NOT NULL DEFAULT '',
                    status TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL
                )
            """)
            connection.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_lower
                ON users (LOWER(username))
            """)
            connection.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    expires_at TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            connection.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    message_id TEXT PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    edited_at TEXT,
                    deleted_at TEXT,
                    reply_to_message_id TEXT
                )
            """)
            connection.execute("CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)")
            connection.execute("""
                CREATE TABLE IF NOT EXISTS message_reactions (
                    message_id TEXT NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    reaction TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (message_id, user_id, reaction)
                )
            """)
            connection.execute("CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON message_reactions(message_id)")
        else:
            connection.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
                    password_hash TEXT NOT NULL,
                    password_salt TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    avatar TEXT NOT NULL DEFAULT '',
                    status TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    expires_at TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS messages (
                    message_id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    edited_at TEXT,
                    deleted_at TEXT,
                    reply_to_message_id TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
                CREATE TABLE IF NOT EXISTS message_reactions (
                    message_id TEXT NOT NULL,
                    user_id INTEGER NOT NULL,
                    reaction TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (message_id, user_id, reaction),
                    FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON message_reactions(message_id);
            """)

            for statement in (
                "ALTER TABLE messages ADD COLUMN deleted_at TEXT",
                "ALTER TABLE messages ADD COLUMN reply_to_message_id TEXT",
            ):
                try:
                    connection.execute(statement)
                except sqlite3.OperationalError:
                    pass

        connection.commit()
    finally:
        connection.close()


def save_message(message_id, user_id, message, created_at, reply_to_message_id=None):
    connection = get_connection()
    try:
        if using_postgres():
            connection.execute(
                """
                INSERT INTO messages
                    (message_id, user_id, message, created_at, reply_to_message_id)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (message_id) DO NOTHING
                """,
                (message_id, user_id, message, created_at, reply_to_message_id),
            )
        else:
            connection.execute(
                """
                INSERT OR IGNORE INTO messages
                    (message_id, user_id, message, created_at, reply_to_message_id)
                VALUES (?, ?, ?, ?, ?)
                """,
                (message_id, user_id, message, created_at, reply_to_message_id),
            )
        connection.commit()
    finally:
        connection.close()


def get_message_owner(message_id):
    connection = get_connection()
    try:
        query = "SELECT user_id FROM messages WHERE message_id = %s" if using_postgres() else "SELECT user_id FROM messages WHERE message_id = ?"
        row = connection.execute(query, (message_id,)).fetchone()
        return int(row["user_id"]) if row else None
    finally:
        connection.close()


def get_message(message_id):
    connection = get_connection()
    try:
        query = """
            SELECT m.message_id, m.user_id, m.message, m.created_at,
                   m.edited_at, m.deleted_at, m.reply_to_message_id,
                   u.username, u.display_name, u.avatar
            FROM messages m
            JOIN users u ON u.id = m.user_id
            WHERE m.message_id = %s
        """ if using_postgres() else """
            SELECT m.message_id, m.user_id, m.message, m.created_at,
                   m.edited_at, m.deleted_at, m.reply_to_message_id,
                   u.username, u.display_name, u.avatar
            FROM messages m
            JOIN users u ON u.id = m.user_id
            WHERE m.message_id = ?
        """
        row = connection.execute(query, (message_id,)).fetchone()
        return dict(row) if row else None
    finally:
        connection.close()


def update_message(message_id, user_id, message, edited_at):
    connection = get_connection()
    try:
        query = """
            UPDATE messages
            SET message = %s, edited_at = %s, deleted_at = NULL
            WHERE message_id = %s AND user_id = %s
        """ if using_postgres() else """
            UPDATE messages
            SET message = ?, edited_at = ?, deleted_at = NULL
            WHERE message_id = ? AND user_id = ?
        """
        cursor = connection.execute(query, (message, edited_at, message_id, user_id))
        connection.commit()
        return cursor.rowcount > 0
    finally:
        connection.close()


def delete_message(message_id, user_id, deleted_at):
    connection = get_connection()
    try:
        query = """
            UPDATE messages
            SET deleted_at = %s
            WHERE message_id = %s AND user_id = %s
        """ if using_postgres() else """
            UPDATE messages
            SET deleted_at = ?
            WHERE message_id = ? AND user_id = ?
        """
        cursor = connection.execute(query, (deleted_at, message_id, user_id))
        connection.commit()
        return cursor.rowcount > 0
    finally:
        connection.close()


def toggle_reaction(message_id, user_id, reaction, created_at):
    connection = get_connection()
    try:
        select_query = """
            SELECT 1 FROM message_reactions
            WHERE message_id = %s AND user_id = %s AND reaction = %s
        """ if using_postgres() else """
            SELECT 1 FROM message_reactions
            WHERE message_id = ? AND user_id = ? AND reaction = ?
        """
        existing = connection.execute(select_query, (message_id, user_id, reaction)).fetchone()

        if existing:
            delete_query = """
                DELETE FROM message_reactions
                WHERE message_id = %s AND user_id = %s AND reaction = %s
            """ if using_postgres() else """
                DELETE FROM message_reactions
                WHERE message_id = ? AND user_id = ? AND reaction = ?
            """
            connection.execute(delete_query, (message_id, user_id, reaction))
            active = False
        else:
            if using_postgres():
                connection.execute(
                    """
                    INSERT INTO message_reactions
                        (message_id, user_id, reaction, created_at)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (message_id, user_id, reaction, created_at),
                )
            else:
                connection.execute(
                    """
                    INSERT INTO message_reactions
                        (message_id, user_id, reaction, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (message_id, user_id, reaction, created_at),
                )
            active = True

        query = """
            SELECT reaction, COUNT(*) AS count
            FROM message_reactions
            WHERE message_id = %s
            GROUP BY reaction
        """ if using_postgres() else """
            SELECT reaction, COUNT(*) AS count
            FROM message_reactions
            WHERE message_id = ?
            GROUP BY reaction
        """
        rows = connection.execute(query, (message_id,)).fetchall()
        connection.commit()
        return active, {row["reaction"]: row["count"] for row in rows}
    finally:
        connection.close()


def get_reactions(message_id):
    connection = get_connection()
    try:
        query = """
            SELECT reaction, COUNT(*) AS count
            FROM message_reactions
            WHERE message_id = %s
            GROUP BY reaction
        """ if using_postgres() else """
            SELECT reaction, COUNT(*) AS count
            FROM message_reactions
            WHERE message_id = ?
            GROUP BY reaction
        """
        rows = connection.execute(query, (message_id,)).fetchall()
        return {row["reaction"]: row["count"] for row in rows}
    finally:
        connection.close()
