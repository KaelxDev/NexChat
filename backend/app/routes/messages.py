from fastapi import APIRouter, Header, HTTPException, Query, Request, status

from app.auth import get_user_from_token
from app.routes.auth import require_user
from app.message_history import get_message_history

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
