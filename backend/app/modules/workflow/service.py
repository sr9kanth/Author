import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.workflow.models import ALLOWED_TRANSITIONS, ReviewComment, ReviewWorkflow, WorkflowEvent, WorkflowState
from app.modules.workflow.schemas import ReviewCommentCreate, ReviewCommentRead, ReviewWorkflowRead, WorkflowEventRead


class WorkflowService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_or_create_workflow(self, content_id: str) -> ReviewWorkflowRead:
        result = await self.db.execute(
            select(ReviewWorkflow).where(ReviewWorkflow.content_id == uuid.UUID(content_id))
        )
        workflow = result.scalar_one_or_none()
        if not workflow:
            workflow = ReviewWorkflow(content_id=uuid.UUID(content_id))
            self.db.add(workflow)
            await self.db.flush()
            await self.db.refresh(workflow)
        return ReviewWorkflowRead.model_validate(workflow)

    async def transition(
        self,
        content_id: str,
        to_state: WorkflowState,
        triggered_by: str,
        notes: str | None = None,
    ) -> ReviewWorkflowRead:
        result = await self.db.execute(
            select(ReviewWorkflow).where(ReviewWorkflow.content_id == uuid.UUID(content_id))
        )
        workflow = result.scalar_one_or_none()
        if not workflow:
            raise ValueError("Workflow not found for content")

        allowed = ALLOWED_TRANSITIONS.get(workflow.current_state, [])
        if to_state not in allowed:
            raise ValueError(
                f"Transition from {workflow.current_state} to {to_state} is not allowed"
            )

        event = WorkflowEvent(
            workflow_id=workflow.id,
            from_state=workflow.current_state,
            to_state=to_state,
            triggered_by=uuid.UUID(triggered_by),
            notes=notes,
        )
        self.db.add(event)
        workflow.current_state = to_state
        await self.db.flush()
        await self.db.refresh(workflow)
        return ReviewWorkflowRead.model_validate(workflow)

    async def add_comment(self, content_id: str, data: ReviewCommentCreate, author_id: str) -> ReviewCommentRead:
        result = await self.db.execute(
            select(ReviewWorkflow).where(ReviewWorkflow.content_id == uuid.UUID(content_id))
        )
        workflow = result.scalar_one_or_none()
        if not workflow:
            raise ValueError("Workflow not found")

        comment = ReviewComment(
            workflow_id=workflow.id,
            author_id=uuid.UUID(author_id),
            body=data.body,
        )
        self.db.add(comment)
        await self.db.flush()
        await self.db.refresh(comment)
        return ReviewCommentRead.model_validate(comment)

    async def get_events(self, content_id: str) -> list[WorkflowEventRead]:
        result = await self.db.execute(
            select(ReviewWorkflow).where(ReviewWorkflow.content_id == uuid.UUID(content_id))
        )
        workflow = result.scalar_one_or_none()
        if not workflow:
            return []
        events_result = await self.db.execute(
            select(WorkflowEvent).where(WorkflowEvent.workflow_id == workflow.id)
        )
        return [WorkflowEventRead.model_validate(e) for e in events_result.scalars().all()]
