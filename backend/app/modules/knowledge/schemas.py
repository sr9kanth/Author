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
    # The extraction worker stores these as lists (analyze_with_ai returns
    # list[str]); older records may hold dicts. Accept either shape so reads
    # never 500 on a type mismatch.
    extracted_topics: list | dict | None
    extracted_concepts: list | dict | None
    extracted_outcomes: list | dict | None
    keywords: list | None
    content_graph: dict | None = None
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
