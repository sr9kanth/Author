from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.dashboard.schemas import ActivityItem, ActivityList, DashboardStats
from app.modules.frameworks.models import Framework
from app.modules.generation.models import ContentStatus, GeneratedContent

AWAITING_STATUSES = (
    ContentStatus.generated,
    ContentStatus.validated,
    ContentStatus.under_review,
)
APPROVED_STATUSES = (
    ContentStatus.approved,
    ContentStatus.published,
)
REJECTED_STATUSES = (
    ContentStatus.archived,
)


class DashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_stats(self) -> DashboardStats:
        active_frameworks = (
            await self.db.execute(select(func.count(Framework.id)))
        ).scalar_one()

        items_generated = (
            await self.db.execute(select(func.count(GeneratedContent.id)))
        ).scalar_one()

        awaiting_review = (
            await self.db.execute(
                select(func.count(GeneratedContent.id)).where(
                    GeneratedContent.status.in_(AWAITING_STATUSES)
                )
            )
        ).scalar_one()

        approved = (
            await self.db.execute(
                select(func.count(GeneratedContent.id)).where(
                    GeneratedContent.status.in_(APPROVED_STATUSES)
                )
            )
        ).scalar_one()

        rejected = (
            await self.db.execute(
                select(func.count(GeneratedContent.id)).where(
                    GeneratedContent.status.in_(REJECTED_STATUSES)
                )
            )
        ).scalar_one()

        reviewed_total = approved + rejected
        approval_rate = (
            round((approved / reviewed_total) * 100, 1) if reviewed_total else 0.0
        )

        return DashboardStats(
            active_frameworks=active_frameworks,
            items_generated=items_generated,
            awaiting_review=awaiting_review,
            approval_rate=approval_rate,
        )

    async def get_activity(self, limit: int = 10) -> ActivityList:
        activities: list[ActivityItem] = []

        content_rows = (
            await self.db.execute(
                select(GeneratedContent)
                .order_by(GeneratedContent.created_at.desc())
                .limit(limit)
            )
        ).scalars().all()
        for row in content_rows:
            description = (row.body or "")[:120] or row.content_type
            activities.append(
                ActivityItem(
                    id=row.id,
                    type="generated",
                    description=description,
                    created_at=row.created_at,
                )
            )

        try:
            from app.modules.workflow.models import WorkflowEvent

            event_rows = (
                await self.db.execute(
                    select(WorkflowEvent)
                    .order_by(WorkflowEvent.created_at.desc())
                    .limit(limit)
                )
            ).scalars().all()
            for ev in event_rows:
                to_state = getattr(ev.to_state, "value", str(ev.to_state))
                from_state = getattr(ev.from_state, "value", str(ev.from_state))
                activities.append(
                    ActivityItem(
                        id=ev.id,
                        type=to_state,
                        description=ev.notes or f"{from_state} -> {to_state}",
                        created_at=ev.created_at,
                    )
                )
        except Exception:
            pass

        activities.sort(key=lambda a: a.created_at, reverse=True)
        return ActivityList(items=activities[:limit])
