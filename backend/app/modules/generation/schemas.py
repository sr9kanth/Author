import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.modules.generation.models import ContentStatus, JobStatus


class GenerationJobCreate(BaseModel):
    model_config = {"from_attributes": True}

    configuration_id: uuid.UUID | None = None
    knowledge_asset_ids: list[str] = []
    ai_provider: str = "anthropic"
    ai_model: str = "claude-opus-4-8"
    prompt_template: str | None = None
    prompt_version: str = "1.0"


class GenerationJobRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    status: JobStatus
    configuration_id: uuid.UUID | None
    knowledge_asset_ids: list
    ai_provider: str
    ai_model: str
    prompt_version: str
    celery_task_id: str | None
    error_message: str | None
    created_by: uuid.UUID
    created_at: datetime
    completed_at: datetime | None


class GeneratedContentRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    job_id: uuid.UUID
    content_type: str
    body: str
    metadata: dict[str, Any]
    framework_alignment: dict[str, Any]
    source_references: list
    ai_provider: str
    ai_model: str
    prompt_version: str
    status: ContentStatus
    validation_score: float | None
    created_at: datetime
    updated_at: datetime


class GeneratedContentUpdate(BaseModel):
    model_config = {"from_attributes": True}

    body: str | None = None
    status: ContentStatus | None = None


class GenerationJobList(BaseModel):
    items: list[GenerationJobRead]
    total: int


class GeneratedContentList(BaseModel):
    items: list[GeneratedContentRead]
    total: int
