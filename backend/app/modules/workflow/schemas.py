import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.modules.workflow.models import WorkflowState


class ReviewWorkflowRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    content_id: uuid.UUID
    current_state: WorkflowState
    assigned_reviewer_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class WorkflowTransitionRequest(BaseModel):
    to_state: WorkflowState
    notes: str | None = None


class WorkflowEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workflow_id: uuid.UUID
    from_state: WorkflowState
    to_state: WorkflowState
    triggered_by: uuid.UUID
    notes: str | None
    created_at: datetime


class ReviewCommentCreate(BaseModel):
    body: str


class ReviewCommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workflow_id: uuid.UUID
    author_id: uuid.UUID
    body: str
    resolved: bool
    created_at: datetime
    updated_at: datetime
