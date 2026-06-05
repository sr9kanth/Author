from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.assembly.schemas import (
    AssessmentPackageCreate,
    AssessmentPackageList,
    AssessmentPackageRead,
    AssessmentPackageUpdate,
)
from app.modules.assembly.service import AssemblyService

router = APIRouter(prefix="/assembly", tags=["assembly"])


@router.post("", response_model=AssessmentPackageRead, status_code=status.HTTP_201_CREATED)
async def create_package(data: AssessmentPackageCreate, current_user_id: CurrentUserID, db: DBSession) -> AssessmentPackageRead:
    service = AssemblyService(db)
    return await service.create_package(data, current_user_id)


@router.get("", response_model=AssessmentPackageList)
async def list_packages(db: DBSession, current_user_id: CurrentUserID, skip: int = 0, limit: int = 20) -> AssessmentPackageList:
    service = AssemblyService(db)
    return await service.list_packages(skip=skip, limit=limit)


@router.get("/{package_id}", response_model=AssessmentPackageRead)
async def get_package(package_id: str, db: DBSession, current_user_id: CurrentUserID) -> AssessmentPackageRead:
    service = AssemblyService(db)
    try:
        return await service.get_package(package_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{package_id}", response_model=AssessmentPackageRead)
async def update_package(package_id: str, data: AssessmentPackageUpdate, db: DBSession, current_user_id: CurrentUserID) -> AssessmentPackageRead:
    service = AssemblyService(db)
    try:
        return await service.update_package(package_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
