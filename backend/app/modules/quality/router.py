from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.quality.schemas import QualityReport, QualityValidationRead, QualityValidationRequest
from app.modules.quality.service import QualityService
from app.workers.tasks import run_quality_validation

router = APIRouter(prefix="/quality", tags=["quality"])


@router.post("/validate", response_model=dict)
async def trigger_validation(data: QualityValidationRequest, current_user_id: CurrentUserID) -> dict:
    """Dispatch async quality validation via Celery."""
    run_quality_validation.delay(data.content_id)
    return {"message": "Validation queued", "content_id": data.content_id}


@router.get("/content/{content_id}", response_model=list[QualityValidationRead])
async def get_validations(content_id: str, db: DBSession, current_user_id: CurrentUserID) -> list[QualityValidationRead]:
    service = QualityService(db)
    return await service.get_validations(content_id)
