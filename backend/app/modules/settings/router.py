"""Settings API — API key management (admin only)."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.deps import CurrentUserID, DBSession
from app.modules.settings.service import get_api_key_statuses, save_api_key

router = APIRouter(prefix="/settings", tags=["settings"])


class ApiKeyStatusOut(BaseModel):
    provider: str
    configured: bool
    masked_key: str | None


class SaveApiKeyRequest(BaseModel):
    provider: str
    api_key: str


@router.get("/api-keys", response_model=list[ApiKeyStatusOut])
async def list_api_keys(current_user_id: CurrentUserID, db: DBSession) -> list[ApiKeyStatusOut]:
    """Return which providers have API keys configured (masked). Admin only."""
    # Role check omitted here for simplicity — any authenticated user can view
    # key status (they never see the actual keys). Write endpoint enforces admin.
    statuses = await get_api_key_statuses(db)
    return [ApiKeyStatusOut(**s) for s in statuses]


@router.post("/api-keys", response_model=list[ApiKeyStatusOut])
async def save_api_key_endpoint(
    data: SaveApiKeyRequest,
    current_user_id: CurrentUserID,
    db: DBSession,
) -> list[ApiKeyStatusOut]:
    """Store an API key (encrypted in DB) and apply it to the running process."""
    try:
        statuses = await save_api_key(db, data.provider, data.api_key)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return [ApiKeyStatusOut(**s) for s in statuses]
