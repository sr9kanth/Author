"""Pydantic schemas for prompt templates."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PromptTemplateCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    version: str
    template_type: str
    system_prompt: str
    user_template: str
    is_active: bool = False
    notes: str | None = None


class PromptTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    version: str
    template_type: str
    system_prompt: str
    user_template: str
    is_active: bool
    notes: str | None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PromptTemplateList(BaseModel):
    items: list[PromptTemplateRead]
    total: int
