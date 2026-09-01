from fastapi import APIRouter, Header, HTTPException, Query, status

from app.auth import get_user_from_token
from app.message_history import get_message_history

router = APIRouter(prefix="/api/messages", tags=["messages"])


def require_user(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão não encontrada.",
        )

    token = authorization.removeprefix("Bearer ").strip()
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada.",
        )
    return user


@router.get("")
def messages(
    limit: int = Query(default=50, ge=1, le=100),
    before: str | None = Query(default=None, max_length=64),
    authorization: str | None = Header(default=None),
):
    require_user(authorization)
    return get_message_history(limit=limit, before=before)
