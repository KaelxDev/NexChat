import pytest

from app.websocket.chat import ConnectionManager


class FakeWebSocket:
    def __init__(self):
        self.accepted = False
        self.messages = []

    async def accept(self):
        self.accepted = True

    async def send_json(self, data):
        self.messages.append(data)


@pytest.fixture
def user():
    return {
        "id": 1,
        "username": "kael",
        "displayName": "Kael",
        "avatar": "",
        "status": "online",
    }


@pytest.mark.asyncio
async def test_connect_and_disconnect_tracks_presence(user):
    manager = ConnectionManager()
    websocket = FakeWebSocket()

    await manager.connect(websocket, user)

    assert websocket.accepted is True
    assert manager.get_user(websocket) == user
    assert manager.disconnect(websocket) == user
    assert manager.get_user(websocket) is None


@pytest.mark.asyncio
async def test_same_user_on_two_connections_is_not_duplicated_in_presence(user):
    manager = ConnectionManager()
    first = FakeWebSocket()
    second = FakeWebSocket()

    await manager.connect(first, user)
    await manager.connect(second, user)

    users_events = [event for event in second.messages if event.get("type") == "users"]
    assert users_events
    assert len(users_events[-1]["users"]) == 1

    assert manager.disconnect(first) is None
    assert manager.disconnect(second) == user
