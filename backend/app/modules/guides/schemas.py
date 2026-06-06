import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GuideCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    framework_id: uuid.UUID | None = None
    title: str
    body: str
    is_active: bool = True


class GuideUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    framework_id: uuid.UUID | None = None
    title: str | None = None
    body: str | None = None
    is_active: bool | None = None


class GuideRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    framework_id: uuid.UUID | None = None
    title: str
    body: str
    is_active: bool
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class GuideList(BaseModel):
    items: list[GuideRead]
    total: int
