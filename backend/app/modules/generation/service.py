import json
import uuid
from datetime import datetime, timezone

from app.core.config import settings

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.generation.models import ContentStatus, GeneratedContent, GenerationJob, JobStatus
from app.modules.generation.prompts import QUESTION_GENERATION_SYSTEM, QUESTION_GENERATION_USER_TEMPLATE
from app.modules.generation.schemas import (
    GeneratedContentList,
    GeneratedContentRead,
    GeneratedContentUpdate,
    GenerationJobCreate,
    GenerationJobList,
    GenerationJobRead,
)


class GenerationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_job(self, data: GenerationJobCreate, created_by: str) -> GenerationJobRead:
        job = GenerationJob(
            configuration_id=data.configuration_id,
            stimulus_id=data.stimulus_id,
            knowledge_asset_ids=data.knowledge_asset_ids,
            ai_provider=data.ai_provider or settings.LITELLM_DEFAULT_PROVIDER,
            ai_model=data.ai_model or settings.LITELLM_DEFAULT_MODEL,
            prompt_template=data.prompt_template,
            prompt_version=data.prompt_version,
            created_by=uuid.UUID(created_by),
        )
        self.db.add(job)
        await self.db.flush()
        await self.db.refresh(job)
        return GenerationJobRead.model_validate(job)

    async def get_job(self, job_id: str) -> GenerationJobRead:
        result = await self.db.execute(select(GenerationJob).where(GenerationJob.id == uuid.UUID(job_id)))
        job = result.scalar_one_or_none()
        if not job:
            raise ValueError("Generation job not found")
        return GenerationJobRead.model_validate(job)

    async def list_jobs(self, skip: int = 0, limit: int = 20) -> GenerationJobList:
        count_result = await self.db.execute(select(func.count(GenerationJob.id)))
        total = count_result.scalar_one()
        result = await self.db.execute(select(GenerationJob).offset(skip).limit(limit))
        jobs = result.scalars().all()
        return GenerationJobList(
            items=[GenerationJobRead.model_validate(j) for j in jobs],
            total=total,
        )

    async def update_job_status(self, job_id: str, status: JobStatus, error_message: str | None = None) -> None:
        result = await self.db.execute(select(GenerationJob).where(GenerationJob.id == uuid.UUID(job_id)))
        job = result.scalar_one_or_none()
        if not job:
            raise ValueError("Generation job not found")
        job.status = status
        if error_message:
            job.error_message = error_message
        if status == JobStatus.completed:
            job.completed_at = datetime.now(timezone.utc)
        await self.db.flush()

    async def list_contents(self, job_id: str, skip: int = 0, limit: int = 50) -> GeneratedContentList:
        count_result = await self.db.execute(
            select(func.count(GeneratedContent.id)).where(GeneratedContent.job_id == uuid.UUID(job_id))
        )
        total = count_result.scalar_one()
        result = await self.db.execute(
            select(GeneratedContent)
            .options(selectinload(GeneratedContent.stimulus))
            .where(GeneratedContent.job_id == uuid.UUID(job_id))
            .offset(skip)
            .limit(limit)
        )
        contents = result.scalars().all()
        return GeneratedContentList(
            items=[GeneratedContentRead.model_validate(c) for c in contents],
            total=total,
        )

    async def update_content(self, content_id: str, data: GeneratedContentUpdate) -> GeneratedContentRead:
        result = await self.db.execute(select(GeneratedContent).where(GeneratedContent.id == uuid.UUID(content_id)))
        content = result.scalar_one_or_none()
        if not content:
            raise ValueError("Content not found")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(content, field, value)
        await self.db.flush()
        # Eagerly load `stimulus` so model_validate doesn't trigger an async
        # lazy-load (MissingGreenlet → 500).
        await self.db.refresh(content, attribute_names=["stimulus"])
        return GeneratedContentRead.model_validate(content)
