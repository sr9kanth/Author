from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.guides.schemas import GuideCreate, GuideList, GuideRead, GuideUpdate
from app.modules.guides.service import GuideService

router = APIRouter(prefix="/guides", tags=["guides"])


@router.post("", response_model=GuideRead, status_code=status.HTTP_201_CREATED)
async def create_guide(data: GuideCreate, current_user_id: CurrentUserID, db: DBSession) -> GuideRead:
    service = GuideService(db)
    return await service.create_guide(data, current_user_id)


@router.get("", response_model=GuideList)
async def list_guides(
    db: DBSession, current_user_id: CurrentUserID, framework_id: str | None = None
) -> GuideList:
    service = GuideService(db)
    return await service.list_guides(framework_id=framework_id)


@router.get("/{guide_id}", response_model=GuideRead)
async def get_guide(guide_id: str, db: DBSession, current_user_id: CurrentUserID) -> GuideRead:
    service = GuideService(db)
    try:
        return await service.get_guide(guide_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{guide_id}", response_model=GuideRead)
async def update_guide(
    guide_id: str, data: GuideUpdate, db: DBSession, current_user_id: CurrentUserID
) -> GuideRead:
    service = GuideService(db)
    try:
        return await service.update_guide(guide_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete("/{guide_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_guide(guide_id: str, db: DBSession, current_user_id: CurrentUserID) -> None:
    service = GuideService(db)
    try:
        await service.delete_guide(guide_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
