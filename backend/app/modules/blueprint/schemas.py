import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class BlueprintTargetRow(BaseModel):
    topic: str = ""
    question_type: str = ""
    difficulty: str = ""
    cognitive_level: str = ""
    target_count: int = 1


class BlueprintCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    description: str | None = None
    framework_id: uuid.UUID | None = None
    targets: list[dict[str, Any]] = []


class BlueprintRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    framework_id: uuid.UUID | None
    targets: list[dict[str, Any]]
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class BlueprintGapRow(BaseModel):
    topic: str
    question_type: str
    difficulty: str
    cognitive_level: str
    target_count: int
    actual_count: int
    gap: int


class BlueprintWithGaps(BlueprintRead):
    gap_analysis: list[BlueprintGapRow]


class BlueprintList(BaseModel):
    items: list[BlueprintRead]
    total: int


class GenerateResponse(BaseModel):
    job_ids: list[str]
