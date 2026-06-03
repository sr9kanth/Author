import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AssessmentItemCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    content_id: uuid.UUID
    item_code: str | None = None
    tags: list[str] = []
    notes: str | None = None


class AssessmentItemRead(AssessmentItemCreate):
    id: uuid.UUID
    usage_count: int
    average_difficulty: float | None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    # Passthrough fields surfaced from the linked GeneratedContent
    stem: str | None = None
    type: str | None = None
    bloom: str | None = None
    difficulty: str | None = None
    topic: str | None = None


class AssessmentItemList(BaseModel):
    items: list[AssessmentItemRead]
    total: int
