"""Encrypted key-value store for application settings."""

import base64
import hashlib
import os

from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.settings.models import AppSetting


def _fernet() -> Fernet:
    """Derive a Fernet key from the application SECRET_KEY."""
    raw = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    key = base64.urlsafe_b64encode(raw)
    return Fernet(key)


class SettingsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._f = _fernet()

    async def get(self, key: str) -> str | None:
        result = await self.db.execute(select(AppSetting).where(AppSetting.key == key))
        row = result.scalar_one_or_none()
        if row is None:
            return None
        return self._f.decrypt(row.value.encode()).decode()

    async def set(self, key: str, value: str) -> None:
        encrypted = self._f.encrypt(value.encode()).decode()
        result = await self.db.execute(select(AppSetting).where(AppSetting.key == key))
        row = result.scalar_one_or_none()
        if row is None:
            row = AppSetting(key=key, value=encrypted)
            self.db.add(row)
        else:
            row.value = encrypted
        await self.db.commit()


# Provider → environment variable name mapping
PROVIDER_ENV_MAP: dict[str, str] = {
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
}

ALL_PROVIDERS = list(PROVIDER_ENV_MAP.keys())


def _mask(value: str) -> str | None:
    if not value:
        return None
    if len(value) <= 8:
        return "****"
    return value[:4] + "..." + value[-4:]


async def get_api_key_statuses(db: AsyncSession) -> list[dict]:
    service = SettingsService(db)
    statuses = []
    for provider, env_var in PROVIDER_ENV_MAP.items():
        # DB takes precedence over env
        db_val = await service.get(f"llm_key_{provider}")
        env_val = os.environ.get(env_var, "")
        effective = db_val or env_val or ""
        statuses.append(
            {
                "provider": provider,
                "configured": bool(effective),
                "masked_key": _mask(effective),
            }
        )
    return statuses


async def save_api_key(db: AsyncSession, provider: str, api_key: str) -> list[dict]:
    if provider not in PROVIDER_ENV_MAP:
        raise ValueError(f"Unknown provider: {provider}")
    env_var = PROVIDER_ENV_MAP[provider]
    service = SettingsService(db)
    await service.set(f"llm_key_{provider}", api_key)
    # Also update the running process so LiteLLM picks it up immediately
    if api_key:
        os.environ[env_var] = api_key
    elif env_var in os.environ:
        del os.environ[env_var]
    return await get_api_key_statuses(db)
