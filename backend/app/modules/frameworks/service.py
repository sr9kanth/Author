import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.frameworks.models import Framework
from app.modules.frameworks.schemas import FrameworkCreate, FrameworkList, FrameworkRead


class FrameworkService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_framework(self, data: FrameworkCreate, created_by: str) -> FrameworkRead:
        framework = Framework(
            name=data.name,
            description=data.description,
            version=data.version,
            created_by=uuid.UUID(created_by),
        )
        self.db.add(framework)
        await self.db.flush()
        await self.db.refresh(framework)
        return FrameworkRead.model_validate(framework)

    async def list_frameworks(self, skip: int = 0, limit: int = 20) -> FrameworkList:
        count_result = await self.db.execute(select(func.count(Framework.id)))
        total = count_result.scalar_one()
        result = await self.db.execute(
            select(Framework)
            .options(selectinload(Framework.domains))
            .offset(skip)
            .limit(limit)
        )
        frameworks = result.scalars().all()
        return FrameworkList(
            items=[FrameworkRead.model_validate(f) for f in frameworks],
            total=total,
        )

    async def get_framework(self, framework_id: str) -> FrameworkRead:
        result = await self.db.execute(
            select(Framework)
            .options(selectinload(Framework.domains))
            .where(Framework.id == uuid.UUID(framework_id))
        )
        framework = result.scalar_one_or_none()
        if not framework:
            raise ValueError("Framework not found")
        return FrameworkRead.model_validate(framework)

    async def delete_framework(self, framework_id: str) -> None:
        result = await self.db.execute(select(Framework).where(Framework.id == uuid.UUID(framework_id)))
        framework = result.scalar_one_or_none()
        if not framework:
            raise ValueError("Framework not found")
        await self.db.delete(framework)
