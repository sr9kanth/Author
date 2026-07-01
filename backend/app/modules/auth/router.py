from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.deps import CurrentUserID, DBSession
from app.core.security import decode_token, hash_password
from app.modules.audit.service import AuditService
from app.modules.auth.models import User
from app.modules.auth.schemas import LoginRequest, RefreshRequest, TokenResponse, UserCreate, UserRead, UserUpdate
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


class AdminResetPasswordRequest(BaseModel):
    email: str
    new_password: str
    secret: str


@router.post("/admin-reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def admin_reset_password(data: AdminResetPasswordRequest, db: DBSession) -> None:
    """Reset a user's password given the ADMIN_RESET_SECRET shared secret.

    Disabled (404) unless ADMIN_RESET_SECRET is set in the environment. This
    is a break-glass tool for recovering account access without shell/CLI
    access to the deployment — set the secret in your host's env vars, call
    this once, then unset it.
    """
    if not settings.ADMIN_RESET_SECRET:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if data.secret != settings.ADMIN_RESET_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid secret")

    from sqlalchemy import select

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.hashed_password = hash_password(data.new_password)
    await db.commit()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: DBSession) -> UserRead:
    service = AuthService(db)
    try:
        return await service.create_user(data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: DBSession, request: Request) -> TokenResponse:
    service = AuthService(db)
    try:
        token_response = await service.authenticate(data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    try:
        payload = decode_token(token_response.access_token)
        user_id = payload.get("sub")
        await AuditService(db).log(
            user_id=user_id,
            action="auth.login",
            resource_type="user",
            resource_id=user_id,
            ip_address=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return token_response


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: DBSession) -> TokenResponse:
    service = AuthService(db)
    try:
        return await service.refresh_tokens(data.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))


@router.get("/me", response_model=UserRead)
async def get_me(current_user_id: CurrentUserID, db: DBSession) -> UserRead:
    service = AuthService(db)
    try:
        return await service.get_user(current_user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/me", response_model=UserRead)
async def update_me(data: UserUpdate, current_user_id: CurrentUserID, db: DBSession) -> UserRead:
    service = AuthService(db)
    try:
        return await service.update_user(current_user_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# Mounted at /api/v1/auth/users but also re-exported at /api/v1/users via main.py users_router
@router.get("/users", response_model=dict)
async def list_users(current_user_id: CurrentUserID, db: DBSession, skip: int = 0, limit: int = 100) -> dict:
    service = AuthService(db)
    return await service.list_users(skip=skip, limit=limit)
