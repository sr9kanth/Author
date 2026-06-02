from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.generation.schemas import (
    GeneratedContentList,
    GeneratedContentRead,
    GeneratedContentUpdate,
    GenerationJobCreate,
    GenerationJobList,
    GenerationJobRead,
)
from app.modules.generation.service import GenerationService
from app.workers.tasks import run_generation_job

router = APIRouter(prefix="/generation", tags=["generation"])


@router.post("/jobs", response_model=GenerationJobRead, status_code=status.HTTP_201_CREATED)
async def create_job(data: GenerationJobCreate, current_user_id: CurrentUserID, db: DBSession) -> GenerationJobRead:
    service = GenerationService(db)
    job = await service.create_job(data, current_user_id)
    # Dispatch Celery task
    run_generation_job.delay(str(job.id))
    return job


@router.get("/jobs", response_model=GenerationJobList)
async def list_jobs(db: DBSession, current_user_id: CurrentUserID, skip: int = 0, limit: int = 20) -> GenerationJobList:
    service = GenerationService(db)
    return await service.list_jobs(skip=skip, limit=limit)


@router.get("/jobs/{job_id}", response_model=GenerationJobRead)
async def get_job(job_id: str, db: DBSession, current_user_id: CurrentUserID) -> GenerationJobRead:
    service = GenerationService(db)
    try:
        return await service.get_job(job_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/jobs/{job_id}/contents", response_model=GeneratedContentList)
async def list_contents(job_id: str, db: DBSession, current_user_id: CurrentUserID, skip: int = 0, limit: int = 50) -> GeneratedContentList:
    service = GenerationService(db)
    return await service.list_contents(job_id, skip=skip, limit=limit)


@router.patch("/contents/{content_id}", response_model=GeneratedContentRead)
async def update_content(content_id: str, data: GeneratedContentUpdate, db: DBSession, current_user_id: CurrentUserID) -> GeneratedContentRead:
    service = GenerationService(db)
    try:
        return await service.update_content(content_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
