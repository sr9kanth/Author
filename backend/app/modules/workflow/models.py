import enum
import uuid

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class WorkflowState(str, enum.Enum):
    draft = "draft"
    generated = "generated"
    validated = "validated"
    under_review = "under_review"
    approved = "approved"
    published = "published"
    archived = "archived"


ALLOWED_TRANSITIONS: dict[WorkflowState, list[WorkflowState]] = {
    WorkflowState.draft: [WorkflowState.generated],
    WorkflowState.generated: [WorkflowState.validated, WorkflowState.draft],
    WorkflowState.validated: [WorkflowState.under_review, WorkflowState.draft],
    WorkflowState.under_review: [WorkflowState.approved, WorkflowState.draft],
    WorkflowState.approved: [WorkflowState.published, WorkflowState.draft],
    WorkflowState.published: [WorkflowState.archived],
    WorkflowState.archived: [],
}


class ReviewWorkflow(Base):
    __tablename__ = "review_workflows"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("generated_contents.id"), nullable=False, unique=True)
    current_state: Mapped[WorkflowState] = mapped_column(Enum(WorkflowState), nullable=False, default=WorkflowState.draft)
    assigned_reviewer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    content = relationship("GeneratedContent", foreign_keys=[content_id])
    assigned_reviewer = relationship("User", foreign_keys=[assigned_reviewer_id])
    events: Mapped[list["WorkflowEvent"]] = relationship("WorkflowEvent", back_populates="workflow", cascade="all, delete-orphan")
    comments: Mapped[list["ReviewComment"]] = relationship("ReviewComment", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowEvent(Base):
    __tablename__ = "workflow_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("review_workflows.id"), nullable=False)
    from_state: Mapped[WorkflowState] = mapped_column(Enum(WorkflowState), nullable=False)
    to_state: Mapped[WorkflowState] = mapped_column(Enum(WorkflowState), nullable=False)
    triggered_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    workflow: Mapped[ReviewWorkflow] = relationship("ReviewWorkflow", back_populates="events")
    actor = relationship("User", foreign_keys=[triggered_by])


class ReviewComment(Base):
    __tablename__ = "review_comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("review_workflows.id"), nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    resolved: Mapped[bool] = mapped_column(nullable=False, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    workflow: Mapped[ReviewWorkflow] = relationship("ReviewWorkflow", back_populates="comments")
    author = relationship("User", foreign_keys=[author_id])
