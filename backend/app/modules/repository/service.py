import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.repository.models import AssessmentItem
from app.modules.repository.schemas import AssessmentItemCreate, AssessmentItemList, AssessmentItemRead


class RepositoryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def add_item(self, data: AssessmentItemCreate, created_by: str) -> AssessmentItemRead:
        item = AssessmentItem(
            content_id=data.content_id,
            item_code=data.item_code,
            tags=data.tags,
            notes=data.notes,
            created_by=uuid.UUID(created_by),
        )
        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)
        return AssessmentItemRead.model_validate(item)

    async def list_items(self, skip: int = 0, limit: int = 20, tags: list[str] | None = None) -> AssessmentItemList:
        query = select(AssessmentItem)
        count_query = select(func.count(AssessmentItem.id))
        total = (await self.db.execute(count_query)).scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        items = result.scalars().all()
        return AssessmentItemList(
            items=[AssessmentItemRead.model_validate(i) for i in items],
            total=total,
        )

    async def get_item(self, item_id: str) -> AssessmentItemRead:
        result = await self.db.execute(select(AssessmentItem).where(AssessmentItem.id == uuid.UUID(item_id)))
        item = result.scalar_one_or_none()
        if not item:
            raise ValueError("Item not found")
        return AssessmentItemRead.model_validate(item)
