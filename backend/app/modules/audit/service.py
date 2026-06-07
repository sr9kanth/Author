from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import AuditLog


class AuditService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def log(
        self,
        user_id: str | uuid.UUID | None,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        ip_address: str | None = None,
    ) -> AuditLog:
        uid: uuid.UUID | None = None
        if user_id is not None:
            uid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id

        entry = AuditLog(
            user_id=uid,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            extra=metadata,
            ip_address=ip_address,
        )
        self.db.add(entry)
        await self.db.flush()
        return entry

    async def list_logs(
        self,
        resource_type: str | None = None,
        resource_id: str | None = None,
        user_id: str | None = None,
        limit: int = 50,
        skip: int = 0,
    ) -> list[AuditLog]:
        stmt = select(AuditLog)
        if resource_type is not None:
            stmt = stmt.where(AuditLog.resource_type == resource_type)
        if resource_id is not None:
            stmt = stmt.where(AuditLog.resource_id == resource_id)
        if user_id is not None:
            stmt = stmt.where(AuditLog.user_id == uuid.UUID(user_id))
        stmt = stmt.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
