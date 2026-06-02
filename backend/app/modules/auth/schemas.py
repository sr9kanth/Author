import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, model_config

from app.modules.auth.models import UserRole


class UserCreate(BaseModel):
    model_config = model_config = {"from_attributes": True}

    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.author


class UserRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    mfa_enabled: bool
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    model_config = {"from_attributes": True}

    full_name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    mfa_enabled: bool | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str
