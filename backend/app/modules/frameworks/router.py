from fastapi import APIRouter, HTTPException, Request, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.audit.service import AuditService
from app.modules.frameworks.schemas import FrameworkCreate, FrameworkList, FrameworkRead
from app.modules.frameworks.service import FrameworkService

router = APIRouter(prefix="/frameworks", tags=["frameworks"])


@router.post("", response_model=FrameworkRead, status_code=status.HTTP_201_CREATED)
async def create_framework(data: FrameworkCreate, current_user_id: CurrentUserID, db: DBSession, request: Request) -> FrameworkRead:
    service = FrameworkService(db)
    framework = await service.create_framework(data, current_user_id)
    try:
        await AuditService(db).log(
            user_id=current_user_id,
            action="framework.create",
            resource_type="framework",
            resource_id=str(framework.id),
            ip_address=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return framework


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
async def delete_framework(framework_id: str, db: DBSession, current_user_id: CurrentUserID, request: Request) -> None:
    service = FrameworkService(db)
    try:
        await service.delete_framework(framework_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    try:
        await AuditService(db).log(
            user_id=current_user_id,
            action="framework.delete",
            resource_type="framework",
            resource_id=framework_id,
            ip_address=request.client.host if request.client else None,
        )
    except Exception:
        pass
