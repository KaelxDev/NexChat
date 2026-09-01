ALLOWED_ORIGINS = frozenset(
    {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://nexchat-chat.vercel.app",
    }
)


def is_allowed_origin(origin: str | None) -> bool:
    if not origin:
        return True
    return origin in ALLOWED_ORIGINS
