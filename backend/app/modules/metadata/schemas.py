import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MetadataValue(BaseModel):
    value: str
    display_title: str


class MetadataDimensionCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    key: str
    value_type: str = "dictionary_single"
    dimension_values: list[MetadataValue] = []
    explanation: str | None = None
    scopes: list[str] = []
    source: str = "defined"
    is_active: bool = True
    sort_order: int = 0


class MetadataDimensionUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str | None = None
    key: str | None = None
    value_type: str | None = None
    dimension_values: list[MetadataValue] | None = None
    explanation: str | None = None
    scopes: list[str] | None = None
    source: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class MetadataDimensionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    key: str
    value_type: str
    dimension_values: list[MetadataValue] = []
    explanation: str | None = None
    scopes: list[str] = []
    source: str
    is_active: bool
    sort_order: int
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class MetadataDimensionList(BaseModel):
    items: list[MetadataDimensionRead]
    total: int
