from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUserID
from app.modules.orchestration.schemas import CompletionRequest, CompletionResponse, ModelInfo
from app.modules.orchestration.service import AIOrchestrationService

router = APIRouter(prefix="/orchestration", tags=["orchestration"])


@router.get("/models", response_model=list[ModelInfo])
async def list_models(current_user_id: CurrentUserID) -> list[ModelInfo]:
    service = AIOrchestrationService()
    models = await service.get_available_models()
    return [ModelInfo(**m) for m in models]


@router.post("/complete", response_model=CompletionResponse)
async def complete(data: CompletionRequest, current_user_id: CurrentUserID) -> CompletionResponse:
    service = AIOrchestrationService()
    try:
        messages = [m.model_dump() for m in data.messages]
        result = await service.complete_detailed(
            messages=messages,
            model=data.model,
            provider=data.provider,
            max_tokens=data.max_tokens,
            temperature=data.temperature,
        )
        return CompletionResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
