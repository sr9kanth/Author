from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUserID, DBSession
from app.modules.auth.schemas import LoginRequest, RefreshRequest, TokenResponse, UserCreate, UserRead, UserUpdate
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: DBSession) -> UserRead:
    service = AuthService(db)
    try:
        return await service.create_user(data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: DBSession) -> TokenResponse:
    service = AuthService(db)
    try:
        return await service.authenticate(data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))


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
