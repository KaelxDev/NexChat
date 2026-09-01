from fastapi import APIRouter, Header, Query, Request

from app.message_history import get_message_history
from app.routes.auth import require_user

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("")
def messages(
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    before: str | None = Query(default=None, max_length=64),
    authorization: str | None = Header(default=None),
):
    require_user(request, authorization)
    return get_message_history(limit=limit, before=before)
