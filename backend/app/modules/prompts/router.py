"""Router for prompt template governance endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.prompts.schemas import PromptTemplateCreate, PromptTemplateList, PromptTemplateRead
from app.modules.prompts.service import PromptTemplateService

router = APIRouter(prefix="/prompt-templates", tags=["prompt-templates"])


@router.get("", response_model=PromptTemplateList)
async def list_prompt_templates(
    db: DBSession,
    current_user_id: CurrentUserID,
    template_type: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> PromptTemplateList:
    service = PromptTemplateService(db)
    return await service.list_templates(template_type=template_type, skip=skip, limit=limit)


@router.post("", response_model=PromptTemplateRead, status_code=status.HTTP_201_CREATED)
async def create_prompt_template(
    data: PromptTemplateCreate,
    current_user_id: CurrentUserID,
    db: DBSession,
) -> PromptTemplateRead:
    service = PromptTemplateService(db)
    return await service.create_template(data, current_user_id)


@router.get("/active", response_model=PromptTemplateRead | None)
async def get_active_template(
    type: str,
    db: DBSession,
    current_user_id: CurrentUserID,
) -> PromptTemplateRead | None:
    service = PromptTemplateService(db)
    return await service.get_active_template(type)


@router.get("/{template_id}", response_model=PromptTemplateRead)
async def get_prompt_template(
    template_id: str,
    db: DBSession,
    current_user_id: CurrentUserID,
) -> PromptTemplateRead:
    service = PromptTemplateService(db)
    try:
        return await service.get_template(template_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{template_id}/activate", response_model=PromptTemplateRead)
async def activate_prompt_template(
    template_id: str,
    db: DBSession,
    current_user_id: CurrentUserID,
) -> PromptTemplateRead:
    service = PromptTemplateService(db)
    try:
        return await service.activate_template(template_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
