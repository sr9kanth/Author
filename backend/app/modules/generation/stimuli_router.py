"""CRUD endpoints for stimuli (scenario / passage-based questions)."""

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.generation.schemas import StimulusCreate, StimulusRead
from app.modules.generation.stimuli_service import StimuliService

router = APIRouter(prefix="/stimuli", tags=["stimuli"])


@router.get("", response_model=list[StimulusRead])
async def list_stimuli(db: DBSession, current_user_id: CurrentUserID, skip: int = 0, limit: int = 100) -> list[StimulusRead]:
    service = StimuliService(db)
    return await service.list_stimuli(skip=skip, limit=limit)


@router.post("", response_model=StimulusRead, status_code=status.HTTP_201_CREATED)
async def create_stimulus(data: StimulusCreate, db: DBSession, current_user_id: CurrentUserID) -> StimulusRead:
    service = StimuliService(db)
    return await service.create_stimulus(data, current_user_id)


@router.get("/{stimulus_id}", response_model=StimulusRead)
async def get_stimulus(stimulus_id: str, db: DBSession, current_user_id: CurrentUserID) -> StimulusRead:
    service = StimuliService(db)
    try:
        return await service.get_stimulus(stimulus_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete("/{stimulus_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stimulus(stimulus_id: str, db: DBSession, current_user_id: CurrentUserID) -> None:
    service = StimuliService(db)
    try:
        await service.delete_stimulus(stimulus_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
