import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token, hash_password

bearer_scheme = HTTPBearer(auto_error=False)

# Hardcoded dev-bypass user UUID — used when ENVIRONMENT != "production" and no
# token is provided. Lets the local docker-compose stack run without logging in.
_DEV_USER_ID = "00000000-0000-0000-0000-000000000001"
_DEV_USER_EMAIL = "dev@local"


async def _ensure_dev_user(db: AsyncSession) -> str:
    # Several tables FK to users.id (e.g. item_guides.created_by), so the
    # dev-bypass id must actually exist as a row, not just look like a UUID.
    from app.modules.auth.models import User

    existing = await db.get(User, uuid.UUID(_DEV_USER_ID))
    if existing is not None:
        return _DEV_USER_ID

    user = User(
        id=uuid.UUID(_DEV_USER_ID),
        email=_DEV_USER_EMAIL,
        hashed_password=hash_password(uuid.uuid4().hex),
        full_name="Local Dev User",
        role="administrator",
    )
    db.add(user)
    await db.flush()
    return _DEV_USER_ID


async def get_current_user_id(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> str:
    # Dev bypass: no token needed in non-production environments.
    if settings.ENVIRONMENT.lower() != "production" and (credentials is None or not credentials.credentials):
        return await _ensure_dev_user(db)

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject")
    return user_id


DBSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserID = Annotated[str, Depends(get_current_user_id)]
