from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.dashboard.schemas import (
    ActivityItem,
    ActivityList,
    DashboardAnalytics,
    DashboardStats,
    DistributionSlice,
    FunnelStage,
)
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

    async def get_analytics(self) -> DashboardAnalytics:
        rows = (
            await self.db.execute(
                select(
                    GeneratedContent.status,
                    GeneratedContent.content_type,
                    GeneratedContent.content_metadata,
                )
            )
        ).all()

        total = len(rows)
        status_counts: dict[str, int] = {}
        type_counts: dict[str, int] = {}
        difficulty_counts: dict[str, int] = {}

        for status, content_type, metadata in rows:
            status_val = getattr(status, "value", str(status))
            status_counts[status_val] = status_counts.get(status_val, 0) + 1

            type_key = content_type or "unknown"
            type_counts[type_key] = type_counts.get(type_key, 0) + 1

            difficulty = "unspecified"
            if isinstance(metadata, dict):
                raw = metadata.get("difficulty")
                if raw not in (None, ""):
                    difficulty = str(raw)
            difficulty_counts[difficulty] = difficulty_counts.get(difficulty, 0) + 1

        funnel = [
            FunnelStage(name="Created", count=total),
            FunnelStage(
                name="Generated",
                count=status_counts.get(ContentStatus.generated.value, 0),
            ),
            FunnelStage(
                name="Validated",
                count=status_counts.get(ContentStatus.validated.value, 0),
            ),
            FunnelStage(
                name="Under review",
                count=status_counts.get(ContentStatus.under_review.value, 0),
            ),
            FunnelStage(
                name="Approved",
                count=status_counts.get(ContentStatus.approved.value, 0)
                + status_counts.get(ContentStatus.published.value, 0),
            ),
            FunnelStage(
                name="Rejected",
                count=status_counts.get(ContentStatus.archived.value, 0),
            ),
        ]

        by_status = [
            DistributionSlice(label=k, count=v)
            for k, v in sorted(status_counts.items(), key=lambda i: i[1], reverse=True)
        ]
        by_type = [
            DistributionSlice(label=k, count=v)
            for k, v in sorted(type_counts.items(), key=lambda i: i[1], reverse=True)
        ]
        by_difficulty = [
            DistributionSlice(label=k, count=v)
            for k, v in sorted(difficulty_counts.items(), key=lambda i: i[1], reverse=True)
        ]

        return DashboardAnalytics(
            funnel=funnel,
            by_status=by_status,
            by_type=by_type,
            by_difficulty=by_difficulty,
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
                    kind="generated",
                    summary=description,
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
                        kind=to_state,
                        summary=ev.notes or f"{from_state} -> {to_state}",
                        created_at=ev.created_at,
                    )
                )
        except Exception:
            pass

        activities.sort(key=lambda a: a.created_at, reverse=True)
        return ActivityList(items=activities[:limit])
