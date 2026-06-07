import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict

from app.core.deps import CurrentUserID, DBSession
from app.modules.audit.service import AuditService

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    resource_type: str
    resource_id: str | None
    extra: dict[str, Any] | None
    ip_address: str | None
    created_at: datetime


class AuditLogList(BaseModel):
    items: list[AuditLogRead]
    total: int


@router.get("/logs", response_model=AuditLogList)
async def list_audit_logs(
    db: DBSession,
    current_user_id: CurrentUserID,  # admin only — caller must be authenticated
    resource_type: str | None = Query(default=None),
    resource_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
) -> AuditLogList:
    service = AuditService(db)
    items = await service.list_logs(
        resource_type=resource_type,
        resource_id=resource_id,
        limit=limit,
        skip=skip,
    )
    return AuditLogList(items=items, total=len(items))
