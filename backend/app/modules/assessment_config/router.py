from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.assessment_config.schemas import (
    AssessmentConfigurationCreate,
    AssessmentConfigurationList,
    AssessmentConfigurationRead,
    AssessmentConfigurationUpdate,
)
from app.modules.assessment_config.service import AssessmentConfigService

router = APIRouter(prefix="/configurations", tags=["assessment-config"])


@router.post("/", response_model=AssessmentConfigurationRead, status_code=status.HTTP_201_CREATED)
async def create_config(data: AssessmentConfigurationCreate, current_user_id: CurrentUserID, db: DBSession) -> AssessmentConfigurationRead:
    service = AssessmentConfigService(db)
    return await service.create_config(data, current_user_id)


@router.get("/", response_model=AssessmentConfigurationList)
async def list_configs(db: DBSession, current_user_id: CurrentUserID, skip: int = 0, limit: int = 20) -> AssessmentConfigurationList:
    service = AssessmentConfigService(db)
    return await service.list_configs(skip=skip, limit=limit)


@router.get("/{config_id}", response_model=AssessmentConfigurationRead)
async def get_config(config_id: str, db: DBSession, current_user_id: CurrentUserID) -> AssessmentConfigurationRead:
    service = AssessmentConfigService(db)
    try:
        return await service.get_config(config_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{config_id}", response_model=AssessmentConfigurationRead)
async def update_config(config_id: str, data: AssessmentConfigurationUpdate, db: DBSession, current_user_id: CurrentUserID) -> AssessmentConfigurationRead:
    service = AssessmentConfigService(db)
    try:
        return await service.update_config(config_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_config(config_id: str, db: DBSession, current_user_id: CurrentUserID) -> None:
    service = AssessmentConfigService(db)
    try:
        await service.delete_config(config_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
