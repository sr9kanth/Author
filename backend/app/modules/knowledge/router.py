from fastapi import APIRouter, HTTPException, Request, UploadFile, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.audit.service import AuditService
from app.modules.knowledge.schemas import KnowledgeAssetCreate, KnowledgeAssetList, KnowledgeAssetRead, KnowledgeAssetUpdate
from app.modules.knowledge.service import KnowledgeService

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.post("", response_model=KnowledgeAssetRead, status_code=status.HTTP_201_CREATED)
async def create_asset(data: KnowledgeAssetCreate, current_user_id: CurrentUserID, db: DBSession, request: Request) -> KnowledgeAssetRead:
    service = KnowledgeService(db)
    try:
        asset = await service.create_asset(data, current_user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    try:
        await AuditService(db).log(
            user_id=current_user_id,
            action="knowledge.create",
            resource_type="knowledge_asset",
            resource_id=str(asset.id),
            ip_address=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return asset


@router.post("/{asset_id}/upload", response_model=KnowledgeAssetRead)
async def upload_file(asset_id: str, file: UploadFile, current_user_id: CurrentUserID, db: DBSession) -> KnowledgeAssetRead:
    service = KnowledgeService(db)
    try:
        file_bytes = await file.read()
        asset = await service.upload_file(asset_id, file_bytes, file.filename or "upload")
        # Kick off async extraction + AI analysis on the worker
        try:
            from app.workers.tasks import process_knowledge_asset
            process_knowledge_asset.delay(str(asset_id))
        except Exception as exc:
            # Worker/broker unavailable — log it; the asset is uploaded and can
            # be re-indexed later, but we must not swallow this silently.
            import structlog
            structlog.get_logger(__name__).error(
                "knowledge_worker_dispatch_failed", asset_id=str(asset_id), error=str(exc)
            )
        return asset
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.get("", response_model=KnowledgeAssetList)
async def list_assets(db: DBSession, current_user_id: CurrentUserID, skip: int = 0, limit: int = 20) -> KnowledgeAssetList:
    service = KnowledgeService(db)
    return await service.list_assets(skip=skip, limit=limit)


@router.get("/{asset_id}", response_model=KnowledgeAssetRead)
async def get_asset(asset_id: str, db: DBSession, current_user_id: CurrentUserID) -> KnowledgeAssetRead:
    service = KnowledgeService(db)
    try:
        return await service.get_asset(asset_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{asset_id}", response_model=KnowledgeAssetRead)
async def update_asset(asset_id: str, data: KnowledgeAssetUpdate, db: DBSession, current_user_id: CurrentUserID) -> KnowledgeAssetRead:
    service = KnowledgeService(db)
    try:
        return await service.update_asset(asset_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(asset_id: str, db: DBSession, current_user_id: CurrentUserID, request: Request) -> None:
    service = KnowledgeService(db)
    try:
        await service.delete_asset(asset_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    try:
        await AuditService(db).log(
            user_id=current_user_id,
            action="knowledge.delete",
            resource_type="knowledge_asset",
            resource_id=asset_id,
            ip_address=request.client.host if request.client else None,
        )
    except Exception:
        pass
