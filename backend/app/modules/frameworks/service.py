import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.auth.models import User
from app.modules.frameworks.models import (
    Competency,
    Domain,
    Framework,
    LearningOutcome,
    Skill,
)
from app.modules.frameworks.schemas import FrameworkCreate, FrameworkList, FrameworkRead
from app.modules.generation.models import GeneratedContent


class FrameworkService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _enrich(self, framework: Framework) -> FrameworkRead:
        read = FrameworkRead.model_validate(framework)

        # outcomes_count: LearningOutcome under Framework -> Domain -> Competency -> Skill
        try:
            outcomes_count = (
                await self.db.execute(
                    select(func.count(LearningOutcome.id))
                    .select_from(LearningOutcome)
                    .join(Skill, LearningOutcome.skill_id == Skill.id)
                    .join(Competency, Skill.competency_id == Competency.id)
                    .join(Domain, Competency.domain_id == Domain.id)
                    .where(Domain.framework_id == framework.id)
                )
            ).scalar_one()
        except Exception:
            outcomes_count = 0
        read.outcomes_count = outcomes_count or 0

        # items_count: GeneratedContent whose framework_alignment references this framework.
        # framework_alignment is a JSON blob; reliable joining is not guaranteed, so fall
        # back to 0 on any error.
        try:
            items_count = (
                await self.db.execute(
                    select(func.count(GeneratedContent.id)).where(
                        GeneratedContent.framework_alignment["framework_id"].astext
                        == str(framework.id)
                    )
                )
            ).scalar_one()
        except Exception:
            items_count = 0
        read.items_count = items_count or 0

        # owner_name via created_by -> User.full_name
        try:
            owner_name = (
                await self.db.execute(
                    select(User.full_name).where(User.id == framework.created_by)
                )
            ).scalar_one_or_none()
        except Exception:
            owner_name = None
        read.owner_name = owner_name

        return read

    async def create_framework(self, data: FrameworkCreate, created_by: str) -> FrameworkRead:
        framework = Framework(
            name=data.name,
            description=data.description,
            version=data.version,
            domain=data.domain,
            status=data.status,
            created_by=uuid.UUID(created_by),
        )
        self.db.add(framework)
        await self.db.flush()
        await self.db.refresh(framework)
        return await self._enrich(framework)

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
        items = [await self._enrich(f) for f in frameworks]
        return FrameworkList(items=items, total=total)

    async def get_framework(self, framework_id: str) -> FrameworkRead:
        result = await self.db.execute(
            select(Framework)
            .options(selectinload(Framework.domains))
            .where(Framework.id == uuid.UUID(framework_id))
        )
        framework = result.scalar_one_or_none()
        if not framework:
            raise ValueError("Framework not found")
        return await self._enrich(framework)

    async def delete_framework(self, framework_id: str) -> None:
        result = await self.db.execute(select(Framework).where(Framework.id == uuid.UUID(framework_id)))
        framework = result.scalar_one_or_none()
        if not framework:
            raise ValueError("Framework not found")
        await self.db.delete(framework)
