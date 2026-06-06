import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.guides.models import ItemGuide
from app.modules.guides.schemas import GuideCreate, GuideList, GuideRead, GuideUpdate


class GuideService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_guide(self, data: GuideCreate, created_by: str) -> GuideRead:
        guide = ItemGuide(
            framework_id=data.framework_id,
            title=data.title,
            body=data.body,
            is_active=data.is_active,
            created_by=uuid.UUID(created_by),
        )
        self.db.add(guide)
        await self.db.flush()
        await self.db.refresh(guide)
        return GuideRead.model_validate(guide)

    async def list_guides(self, framework_id: str | None = None) -> GuideList:
        stmt = select(ItemGuide)
        count_stmt = select(func.count(ItemGuide.id))
        if framework_id is not None:
            fid = uuid.UUID(framework_id)
            stmt = stmt.where(ItemGuide.framework_id == fid)
            count_stmt = count_stmt.where(ItemGuide.framework_id == fid)
        total = (await self.db.execute(count_stmt)).scalar_one()
        result = await self.db.execute(stmt.order_by(ItemGuide.created_at.desc()))
        guides = result.scalars().all()
        return GuideList(items=[GuideRead.model_validate(g) for g in guides], total=total)

    async def get_guide(self, guide_id: str) -> GuideRead:
        result = await self.db.execute(select(ItemGuide).where(ItemGuide.id == uuid.UUID(guide_id)))
        guide = result.scalar_one_or_none()
        if not guide:
            raise ValueError("Guide not found")
        return GuideRead.model_validate(guide)

    async def update_guide(self, guide_id: str, data: GuideUpdate) -> GuideRead:
        result = await self.db.execute(select(ItemGuide).where(ItemGuide.id == uuid.UUID(guide_id)))
        guide = result.scalar_one_or_none()
        if not guide:
            raise ValueError("Guide not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(guide, field, value)
        await self.db.flush()
        await self.db.refresh(guide)
        return GuideRead.model_validate(guide)

    async def delete_guide(self, guide_id: str) -> None:
        result = await self.db.execute(select(ItemGuide).where(ItemGuide.id == uuid.UUID(guide_id)))
        guide = result.scalar_one_or_none()
        if not guide:
            raise ValueError("Guide not found")
        await self.db.delete(guide)

    async def get_active_guide_text(self, framework_id: str | None) -> str | None:
        """Return the body of the active guide for a framework.

        Prefers a framework-specific active guide; falls back to a global
        (framework_id IS NULL) active guide when none is framework-specific.
        """
        if framework_id is not None:
            fid = uuid.UUID(framework_id) if isinstance(framework_id, str) else framework_id
            result = await self.db.execute(
                select(ItemGuide)
                .where(ItemGuide.framework_id == fid, ItemGuide.is_active.is_(True))
                .order_by(ItemGuide.updated_at.desc())
            )
            guide = result.scalars().first()
            if guide:
                return guide.body

        result = await self.db.execute(
            select(ItemGuide)
            .where(ItemGuide.framework_id.is_(None), ItemGuide.is_active.is_(True))
            .order_by(ItemGuide.updated_at.desc())
        )
        guide = result.scalars().first()
        return guide.body if guide else None
