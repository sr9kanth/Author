from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.repository.schemas import AssessmentItemCreate, AssessmentItemList, AssessmentItemRead
from app.modules.repository.service import RepositoryService

router = APIRouter(prefix="/repository", tags=["repository"])


@router.post("/", response_model=AssessmentItemRead, status_code=status.HTTP_201_CREATED)
async def add_item(data: AssessmentItemCreate, current_user_id: CurrentUserID, db: DBSession) -> AssessmentItemRead:
    service = RepositoryService(db)
    return await service.add_item(data, current_user_id)


@router.get("/", response_model=AssessmentItemList)
async def list_items(db: DBSession, current_user_id: CurrentUserID, skip: int = 0, limit: int = 20) -> AssessmentItemList:
    service = RepositoryService(db)
    return await service.list_items(skip=skip, limit=limit)


@router.get("/{item_id}", response_model=AssessmentItemRead)
async def get_item(item_id: str, db: DBSession, current_user_id: CurrentUserID) -> AssessmentItemRead:
    service = RepositoryService(db)
    try:
        return await service.get_item(item_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
