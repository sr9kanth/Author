import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.modules.knowledge.models import AssetStatus, ContentType


class KnowledgeAssetCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    description: str | None = None
    content_type: ContentType


class KnowledgeAssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    content_type: ContentType
    storage_path: str | None
    file_size: int | None
    extracted_topics: dict | None
    extracted_concepts: dict | None
    extracted_outcomes: dict | None
    keywords: list | None
    status: AssetStatus
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class KnowledgeAssetUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str | None = None
    description: str | None = None
    status: AssetStatus | None = None


class KnowledgeAssetList(BaseModel):
    items: list[KnowledgeAssetRead]
    total: int
