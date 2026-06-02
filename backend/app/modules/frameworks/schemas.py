import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LearningOutcomeCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    statement: str
    bloom_level: str | None = None
    sort_order: int = 0


class LearningOutcomeRead(LearningOutcomeCreate):
    id: uuid.UUID
    skill_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class SkillCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    description: str | None = None
    code: str | None = None
    sort_order: int = 0


class SkillRead(SkillCreate):
    id: uuid.UUID
    competency_id: uuid.UUID
    learning_outcomes: list[LearningOutcomeRead] = []
    created_at: datetime
    updated_at: datetime


class CompetencyCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    description: str | None = None
    code: str | None = None
    sort_order: int = 0


class CompetencyRead(CompetencyCreate):
    id: uuid.UUID
    domain_id: uuid.UUID
    skills: list[SkillRead] = []
    created_at: datetime
    updated_at: datetime


class DomainCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    description: str | None = None
    sort_order: int = 0


class DomainRead(DomainCreate):
    id: uuid.UUID
    framework_id: uuid.UUID
    competencies: list[CompetencyRead] = []
    created_at: datetime
    updated_at: datetime


class FrameworkCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    description: str | None = None
    version: str = "1.0"


class FrameworkRead(FrameworkCreate):
    id: uuid.UUID
    created_by: uuid.UUID
    domains: list[DomainRead] = []
    created_at: datetime
    updated_at: datetime


class FrameworkList(BaseModel):
    items: list[FrameworkRead]
    total: int
