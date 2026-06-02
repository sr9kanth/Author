import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AssessmentConfigurationCreate(BaseModel):
    model_config = {"from_attributes": True}

    name: str
    description: str | None = None
    question_types: list[str] = ["multiple_choice"]
    difficulty_levels: dict[str, Any] = {"easy": 3, "medium": 5, "hard": 2}
    cognitive_levels: dict[str, Any] = {"remember": 2, "understand": 3, "apply": 3, "analyse": 2}
    question_count: int = 10
    reading_level: str = "intermediate"
    language: str = "en"
    audience: str | None = None
    jurisdiction: str | None = None
    duration_minutes: int = 60
    framework_id: uuid.UUID | None = None


class AssessmentConfigurationRead(AssessmentConfigurationCreate):
    id: uuid.UUID
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class AssessmentConfigurationUpdate(BaseModel):
    model_config = {"from_attributes": True}

    name: str | None = None
    description: str | None = None
    question_types: list[str] | None = None
    difficulty_levels: dict[str, Any] | None = None
    cognitive_levels: dict[str, Any] | None = None
    question_count: int | None = None
    reading_level: str | None = None
    language: str | None = None
    audience: str | None = None
    jurisdiction: str | None = None
    duration_minutes: int | None = None


class AssessmentConfigurationList(BaseModel):
    items: list[AssessmentConfigurationRead]
    total: int
