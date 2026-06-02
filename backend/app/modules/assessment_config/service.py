import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.assessment_config.models import AssessmentConfiguration
from app.modules.assessment_config.schemas import (
    AssessmentConfigurationCreate,
    AssessmentConfigurationList,
    AssessmentConfigurationRead,
    AssessmentConfigurationUpdate,
)


class AssessmentConfigService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_config(self, data: AssessmentConfigurationCreate, created_by: str) -> AssessmentConfigurationRead:
        config = AssessmentConfiguration(
            **data.model_dump(),
            created_by=uuid.UUID(created_by),
        )
        self.db.add(config)
        await self.db.flush()
        await self.db.refresh(config)
        return AssessmentConfigurationRead.model_validate(config)

    async def list_configs(self, skip: int = 0, limit: int = 20) -> AssessmentConfigurationList:
        count_result = await self.db.execute(select(func.count(AssessmentConfiguration.id)))
        total = count_result.scalar_one()
        result = await self.db.execute(select(AssessmentConfiguration).offset(skip).limit(limit))
        configs = result.scalars().all()
        return AssessmentConfigurationList(
            items=[AssessmentConfigurationRead.model_validate(c) for c in configs],
            total=total,
        )

    async def get_config(self, config_id: str) -> AssessmentConfigurationRead:
        result = await self.db.execute(
            select(AssessmentConfiguration).where(AssessmentConfiguration.id == uuid.UUID(config_id))
        )
        config = result.scalar_one_or_none()
        if not config:
            raise ValueError("Configuration not found")
        return AssessmentConfigurationRead.model_validate(config)

    async def update_config(self, config_id: str, data: AssessmentConfigurationUpdate) -> AssessmentConfigurationRead:
        result = await self.db.execute(
            select(AssessmentConfiguration).where(AssessmentConfiguration.id == uuid.UUID(config_id))
        )
        config = result.scalar_one_or_none()
        if not config:
            raise ValueError("Configuration not found")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(config, field, value)
        await self.db.flush()
        await self.db.refresh(config)
        return AssessmentConfigurationRead.model_validate(config)

    async def delete_config(self, config_id: str) -> None:
        result = await self.db.execute(
            select(AssessmentConfiguration).where(AssessmentConfiguration.id == uuid.UUID(config_id))
        )
        config = result.scalar_one_or_none()
        if not config:
            raise ValueError("Configuration not found")
        await self.db.delete(config)
