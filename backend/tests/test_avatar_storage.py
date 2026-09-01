from datetime import datetime, timezone

import app.database as database
from app.avatar_storage import get_avatar, store_avatar


def test_avatar_roundtrip_persists_binary_content(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setattr(database, "SQLITE_DB_PATH", db_path)
    database.initialize_database()

    created_at = datetime.now(timezone.utc).isoformat()
    connection = database.get_connection()
    try:
        connection.execute(
            "INSERT INTO users "
            "(username, password_hash, password_salt, display_name, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            ("kael", "hash", "salt", "Kael", created_at),
        )
        connection.commit()
    finally:
        connection.close()

    content = b"fake-image-bytes"
    path = store_avatar(1, content, "image/png")

    assert path == "/api/auth/avatar/1"
    assert get_avatar(1) == (content, "image/png")


def test_avatar_update_replaces_previous_content(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setattr(database, "SQLITE_DB_PATH", db_path)
    database.initialize_database()

    created_at = datetime.now(timezone.utc).isoformat()
    connection = database.get_connection()
    try:
        connection.execute(
            "INSERT INTO users "
            "(username, password_hash, password_salt, display_name, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            ("kael", "hash", "salt", "Kael", created_at),
        )
        connection.commit()
    finally:
        connection.close()

    store_avatar(1, b"first", "image/jpeg")
    store_avatar(1, b"second", "image/webp")

    assert get_avatar(1) == (b"second", "image/webp")
