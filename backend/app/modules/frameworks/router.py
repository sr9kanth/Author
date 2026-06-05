from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.frameworks.schemas import FrameworkCreate, FrameworkList, FrameworkRead
from app.modules.frameworks.service import FrameworkService

router = APIRouter(prefix="/frameworks", tags=["frameworks"])


@router.post("", response_model=FrameworkRead, status_code=status.HTTP_201_CREATED)
async def create_framework(data: FrameworkCreate, current_user_id: CurrentUserID, db: DBSession) -> FrameworkRead:
    service = FrameworkService(db)
    return await service.create_framework(data, current_user_id)


@router.get("", response_model=FrameworkList)
async def list_frameworks(db: DBSession, current_user_id: CurrentUserID, skip: int = 0, limit: int = 20) -> FrameworkList:
    service = FrameworkService(db)
    return await service.list_frameworks(skip=skip, limit=limit)


@router.get("/{framework_id}", response_model=FrameworkRead)
async def get_framework(framework_id: str, db: DBSession, current_user_id: CurrentUserID) -> FrameworkRead:
    service = FrameworkService(db)
    try:
        return await service.get_framework(framework_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete("/{framework_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_framework(framework_id: str, db: DBSession, current_user_id: CurrentUserID) -> None:
    service = FrameworkService(db)
    try:
        await service.delete_framework(framework_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
