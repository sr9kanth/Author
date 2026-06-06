import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.metadata.models import MetadataDimension
from app.modules.metadata.schemas import (
    MetadataDimensionCreate,
    MetadataDimensionList,
    MetadataDimensionRead,
    MetadataDimensionUpdate,
)


class MetadataDimensionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, data: MetadataDimensionCreate, created_by: str) -> MetadataDimensionRead:
        dimension = MetadataDimension(
            name=data.name,
            key=data.key,
            value_type=data.value_type,
            dimension_values=[v.model_dump() for v in data.dimension_values],
            explanation=data.explanation,
            scopes=list(data.scopes),
            source=data.source,
            is_active=data.is_active,
            sort_order=data.sort_order,
            created_by=uuid.UUID(created_by),
        )
        self.db.add(dimension)
        await self.db.flush()
        await self.db.refresh(dimension)
        return MetadataDimensionRead.model_validate(dimension)

    async def list(self, scope: str | None = None) -> MetadataDimensionList:
        stmt = select(MetadataDimension).order_by(
            MetadataDimension.sort_order, MetadataDimension.created_at
        )
        result = await self.db.execute(stmt)
        dimensions = list(result.scalars().all())
        if scope:
            dimensions = [d for d in dimensions if scope in (d.scopes or [])]
        items = [MetadataDimensionRead.model_validate(d) for d in dimensions]
        return MetadataDimensionList(items=items, total=len(items))

    async def get(self, dimension_id: str) -> MetadataDimensionRead:
        dimension = await self._get(dimension_id)
        return MetadataDimensionRead.model_validate(dimension)

    async def update(self, dimension_id: str, data: MetadataDimensionUpdate) -> MetadataDimensionRead:
        dimension = await self._get(dimension_id)
        payload = data.model_dump(exclude_unset=True)
        if "dimension_values" in payload and payload["dimension_values"] is not None:
            payload["dimension_values"] = [
                v if isinstance(v, dict) else v.model_dump() for v in payload["dimension_values"]
            ]
        for field, value in payload.items():
            setattr(dimension, field, value)
        await self.db.flush()
        await self.db.refresh(dimension)
        return MetadataDimensionRead.model_validate(dimension)

    async def delete(self, dimension_id: str) -> None:
        dimension = await self._get(dimension_id)
        await self.db.delete(dimension)

    async def _get(self, dimension_id: str) -> MetadataDimension:
        result = await self.db.execute(
            select(MetadataDimension).where(MetadataDimension.id == uuid.UUID(dimension_id))
        )
        dimension = result.scalar_one_or_none()
        if not dimension:
            raise ValueError("Metadata dimension not found")
        return dimension
