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
    kind: str
    summary: str
    created_at: datetime


class ActivityList(BaseModel):
    items: list[ActivityItem]


class FunnelStage(BaseModel):
    name: str
    count: int


class DistributionSlice(BaseModel):
    label: str
    count: int


class DashboardAnalytics(BaseModel):
    funnel: list[FunnelStage]
    by_status: list[DistributionSlice]
    by_type: list[DistributionSlice]
    by_difficulty: list[DistributionSlice]
