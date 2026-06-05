from fastapi import APIRouter

from app.core.deps import CurrentUserID, DBSession
from app.modules.dashboard.schemas import (
    ActivityList,
    DashboardAnalytics,
    DashboardStats,
)
from app.modules.dashboard.service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(db: DBSession, current_user_id: CurrentUserID) -> DashboardStats:
    service = DashboardService(db)
    return await service.get_stats()


@router.get("/analytics", response_model=DashboardAnalytics)
async def get_analytics(db: DBSession, current_user_id: CurrentUserID) -> DashboardAnalytics:
    service = DashboardService(db)
    return await service.get_analytics()


@router.get("/activity", response_model=ActivityList)
async def get_activity(db: DBSession, current_user_id: CurrentUserID, limit: int = 10) -> ActivityList:
    service = DashboardService(db)
    return await service.get_activity(limit=limit)
