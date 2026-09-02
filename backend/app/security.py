import os

DEFAULT_ALLOWED_ORIGINS = frozenset(
    {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://nex-chat-one-eta.vercel.app",
        "https://nexchat-chat.vercel.app",
    }
)


def _load_allowed_origins() -> frozenset[str]:
    configured = os.getenv("ALLOWED_ORIGINS", "")
    if not configured.strip():
        return DEFAULT_ALLOWED_ORIGINS

    origins = {
        origin.strip().rstrip("/")
        for origin in configured.split(",")
        if origin.strip()
    }
    return frozenset(origins)


ALLOWED_ORIGINS = _load_allowed_origins()


def is_allowed_origin(origin: str | None) -> bool:
    if not origin:
        return True
    return origin.rstrip("/") in ALLOWED_ORIGINS
