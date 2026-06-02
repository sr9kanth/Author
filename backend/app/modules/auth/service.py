import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.modules.auth.models import User
from app.modules.auth.schemas import LoginRequest, TokenResponse, UserCreate, UserRead, UserUpdate


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_user(self, data: UserCreate) -> UserRead:
        existing = await self.db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise ValueError("Email already registered")
        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            role=data.role,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return UserRead.model_validate(user)

    async def authenticate(self, data: LoginRequest) -> TokenResponse:
        result = await self.db.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()
        if not user or not verify_password(data.password, user.hashed_password):
            raise ValueError("Invalid email or password")
        if not user.is_active:
            raise ValueError("Account is inactive")
        access_token = create_access_token(subject=str(user.id), extra_claims={"role": user.role.value})
        refresh_token = create_refresh_token(subject=str(user.id))
        return TokenResponse(access_token=access_token, refresh_token=refresh_token)

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token)
        except ValueError as exc:
            raise ValueError("Invalid refresh token") from exc
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")
        user_id = payload.get("sub")
        result = await self.db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise ValueError("User not found or inactive")
        access_token = create_access_token(subject=str(user.id), extra_claims={"role": user.role.value})
        new_refresh = create_refresh_token(subject=str(user.id))
        return TokenResponse(access_token=access_token, refresh_token=new_refresh)

    async def get_user(self, user_id: str) -> UserRead:
        result = await self.db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError("User not found")
        return UserRead.model_validate(user)

    async def update_user(self, user_id: str, data: UserUpdate) -> UserRead:
        result = await self.db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError("User not found")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(user, field, value)
        await self.db.flush()
        await self.db.refresh(user)
        return UserRead.model_validate(user)
