from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.metadata.schemas import (
    MetadataDimensionCreate,
    MetadataDimensionList,
    MetadataDimensionRead,
    MetadataDimensionUpdate,
)
from app.modules.metadata.service import MetadataDimensionService

router = APIRouter(prefix="/metadata", tags=["metadata"])


@router.post("", response_model=MetadataDimensionRead, status_code=status.HTTP_201_CREATED)
async def create_dimension(
    data: MetadataDimensionCreate, current_user_id: CurrentUserID, db: DBSession
) -> MetadataDimensionRead:
    service = MetadataDimensionService(db)
    return await service.create(data, current_user_id)


@router.get("", response_model=MetadataDimensionList)
async def list_dimensions(
    db: DBSession, current_user_id: CurrentUserID, scope: str | None = None
) -> MetadataDimensionList:
    service = MetadataDimensionService(db)
    return await service.list(scope=scope)


@router.get("/{dimension_id}", response_model=MetadataDimensionRead)
async def get_dimension(
    dimension_id: str, db: DBSession, current_user_id: CurrentUserID
) -> MetadataDimensionRead:
    service = MetadataDimensionService(db)
    try:
        return await service.get(dimension_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{dimension_id}", response_model=MetadataDimensionRead)
async def update_dimension(
    dimension_id: str, data: MetadataDimensionUpdate, db: DBSession, current_user_id: CurrentUserID
) -> MetadataDimensionRead:
    service = MetadataDimensionService(db)
    try:
        return await service.update(dimension_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete("/{dimension_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dimension(
    dimension_id: str, db: DBSession, current_user_id: CurrentUserID
) -> None:
    service = MetadataDimensionService(db)
    try:
        await service.delete(dimension_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
