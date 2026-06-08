"""Service layer for Stimulus CRUD."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.generation.models import Stimulus
from app.modules.generation.schemas import StimulusCreate, StimulusRead


class StimuliService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_stimuli(self, skip: int = 0, limit: int = 100) -> list[StimulusRead]:
        result = await self.db.execute(
            select(Stimulus).order_by(Stimulus.created_at.desc()).offset(skip).limit(limit)
        )
        stimuli = result.scalars().all()
        return [StimulusRead.model_validate(s) for s in stimuli]

    async def create_stimulus(self, data: StimulusCreate, created_by: str) -> StimulusRead:
        stimulus = Stimulus(
            title=data.title,
            body=data.body,
            stimulus_type=data.stimulus_type,
            created_by=uuid.UUID(created_by),
        )
        self.db.add(stimulus)
        await self.db.flush()
        await self.db.refresh(stimulus)
        return StimulusRead.model_validate(stimulus)

    async def get_stimulus(self, stimulus_id: str) -> StimulusRead:
        result = await self.db.execute(
            select(Stimulus).where(Stimulus.id == uuid.UUID(stimulus_id))
        )
        stimulus = result.scalar_one_or_none()
        if not stimulus:
            raise ValueError("Stimulus not found")
        return StimulusRead.model_validate(stimulus)

    async def delete_stimulus(self, stimulus_id: str) -> None:
        result = await self.db.execute(
            select(Stimulus).where(Stimulus.id == uuid.UUID(stimulus_id))
        )
        stimulus = result.scalar_one_or_none()
        if not stimulus:
            raise ValueError("Stimulus not found")
        await self.db.delete(stimulus)
        await self.db.flush()
