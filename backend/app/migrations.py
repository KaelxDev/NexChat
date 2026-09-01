from dataclasses import dataclass
from typing import Any, Callable


@dataclass(frozen=True)
class Migration:
    version: int
    name: str
    apply: Callable[[Any, bool], None]


def _migration_001_baseline(connection, postgres: bool) -> None:
    if postgres:
        connection.execute(
            """
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
            """
        )
        connection.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_lower
            ON users (LOWER(username))
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                message_id TEXT PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                edited_at TEXT,
                deleted_at TEXT,
                reply_to_message_id TEXT
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id)"
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS message_reactions (
                message_id TEXT NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                reaction TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (message_id, user_id, reaction)
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON message_reactions(message_id)"
        )
        return

    connection.executescript(
        """
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
        CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id);
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
        """
    )


def _migration_002_message_fields(connection, postgres: bool) -> None:
    if postgres:
        connection.execute(
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TEXT"
        )
        connection.execute(
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_message_id TEXT"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id)"
        )
        return

    columns = {
        row["name"]
        for row in connection.execute("PRAGMA table_info(messages)").fetchall()
    }

    if "deleted_at" not in columns:
        connection.execute("ALTER TABLE messages ADD COLUMN deleted_at TEXT")
    if "reply_to_message_id" not in columns:
        connection.execute("ALTER TABLE messages ADD COLUMN reply_to_message_id TEXT")

    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id)"
    )


def _migration_003_persistent_avatars(connection, postgres: bool) -> None:
    if postgres:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS user_avatars (
                user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                content BYTEA NOT NULL,
                content_type TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        return

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS user_avatars (
            user_id INTEGER PRIMARY KEY,
            content BLOB NOT NULL,
            content_type TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )


MIGRATIONS = (
    Migration(1, "baseline_schema", _migration_001_baseline),
    Migration(2, "message_metadata", _migration_002_message_fields),
    Migration(3, "persistent_avatars", _migration_003_persistent_avatars),
)


def migrate(connection, postgres: bool) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        )
        """
    )
    connection.commit()

    rows = connection.execute(
        "SELECT version FROM schema_migrations ORDER BY version"
    ).fetchall()
    applied = {int(row["version"]) for row in rows}

    for migration in MIGRATIONS:
        if migration.version in applied:
            continue

        try:
            migration.apply(connection, postgres)
            connection.execute(
                """
                INSERT INTO schema_migrations (version, name, applied_at)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                """ if postgres else """
                INSERT INTO schema_migrations (version, name, applied_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                """,
                (migration.version, migration.name),
            )
            connection.commit()
        except Exception:
            connection.rollback()
            raise
