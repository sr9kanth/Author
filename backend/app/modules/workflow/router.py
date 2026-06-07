from fastapi import APIRouter, HTTPException, Request, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.audit.service import AuditService
from app.modules.workflow.schemas import (
    ReviewCommentCreate,
    ReviewCommentRead,
    ReviewWorkflowRead,
    WorkflowEventRead,
    WorkflowTransitionRequest,
)
from app.modules.workflow.service import WorkflowService

router = APIRouter(prefix="/workflow", tags=["workflow"])


@router.get("/content/{content_id}", response_model=ReviewWorkflowRead)
async def get_workflow(content_id: str, db: DBSession, current_user_id: CurrentUserID) -> ReviewWorkflowRead:
    service = WorkflowService(db)
    return await service.get_or_create_workflow(content_id)


@router.post("/content/{content_id}/transition", response_model=ReviewWorkflowRead)
async def transition(content_id: str, data: WorkflowTransitionRequest, db: DBSession, current_user_id: CurrentUserID, request: Request) -> ReviewWorkflowRead:
    service = WorkflowService(db)
    try:
        workflow = await service.transition(content_id, data.to_state, current_user_id, data.notes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    try:
        await AuditService(db).log(
            user_id=current_user_id,
            action="workflow.transition",
            resource_type="content",
            resource_id=content_id,
            metadata={"to_state": data.to_state, "notes": data.notes},
            ip_address=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return workflow


@router.get("/content/{content_id}/events", response_model=list[WorkflowEventRead])
async def get_events(content_id: str, db: DBSession, current_user_id: CurrentUserID) -> list[WorkflowEventRead]:
    service = WorkflowService(db)
    return await service.get_events(content_id)


@router.post("/content/{content_id}/comments", response_model=ReviewCommentRead, status_code=status.HTTP_201_CREATED)
async def add_comment(content_id: str, data: ReviewCommentCreate, db: DBSession, current_user_id: CurrentUserID) -> ReviewCommentRead:
    service = WorkflowService(db)
    try:
        return await service.add_comment(content_id, data, current_user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
