import uuid
from datetime import datetime

from pydantic import BaseModel


class DashboardStats(BaseModel):
    active_frameworks: int
    items_generated: int
    awaiting_review: int
    approval_rate: float


class ActivityItem(BaseModel):
    id: uuid.UUID
    type: str
    description: str
    created_at: datetime


class ActivityList(BaseModel):
    items: list[ActivityItem]
