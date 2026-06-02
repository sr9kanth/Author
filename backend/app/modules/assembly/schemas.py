import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AssessmentPackageCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    description: str | None = None
    configuration_id: uuid.UUID | None = None
    item_ids: list[str] = []
    export_formats: list[str] = ["pdf"]
    metadata: dict[str, Any] = {}


class AssessmentPackageRead(AssessmentPackageCreate):
    id: uuid.UUID
    status: str
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class AssessmentPackageUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str | None = None
    description: str | None = None
    item_ids: list[str] | None = None
    export_formats: list[str] | None = None
    status: str | None = None


class AssessmentPackageList(BaseModel):
    items: list[AssessmentPackageRead]
    total: int
