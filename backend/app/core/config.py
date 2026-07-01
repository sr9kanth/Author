from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://aip:aip@localhost:5432/aip"
    REDIS_URL: str = "redis://localhost:6379/0"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_db_url(cls, v: str) -> str:
        # Railway (and Heroku) provide postgres:// or postgresql:// — rewrite to asyncpg driver
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v
    SECRET_KEY: str = "changeme-use-openssl-rand-hex-32"
    # Optional shared secret that unlocks POST /auth/admin-reset-password.
    # Unset (default) disables the endpoint entirely — set it temporarily in
    # Railway's Variables tab, use the endpoint once, then unset it.
    ADMIN_RESET_SECRET: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = ""
    AWS_ENDPOINT_URL: str = ""  # for MinIO

    LITELLM_DEFAULT_MODEL: str = "deepseek-chat"
    LITELLM_DEFAULT_PROVIDER: str = "deepseek"
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_ENABLED: bool = False  # set true only when a reachable Ollama server is configured
    AI_REQUEST_TIMEOUT: int = 60  # seconds; prevents worker tasks hanging on a stalled AI call

    # --- Embeddings / RAG ---
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIM: int = 1536
    EMBEDDING_PROVIDER: str = "openai"  # litellm-style; needs an OpenAI-compatible key

    @property
    def embeddings_enabled(self) -> bool:
        """True only when a key for the configured embedding provider is set.

        Embeddings require an OpenAI-compatible key. When absent (e.g. local dev
        with only DeepSeek), the RAG pipeline degrades to keyword/text search.
        """
        provider = (self.EMBEDDING_PROVIDER or "openai").lower()
        provider_keys = {
            "openai": self.OPENAI_API_KEY,
            "gemini": self.GEMINI_API_KEY,
            "anthropic": self.ANTHROPIC_API_KEY,
        }
        return bool(provider_keys.get(provider, self.OPENAI_API_KEY))

    ENVIRONMENT: str = "development"
    # Stored as a raw string (comma-separated or JSON) to avoid pydantic-settings
    # auto JSON-decoding env vars. Use CORS_ORIGINS for the parsed list.
    CORS_ORIGINS_RAW: str = Field(
        default="http://localhost:3000",
        validation_alias=AliasChoices("CORS_ORIGINS", "CORS_ORIGINS_RAW"),
    )

    @property
    def CORS_ORIGINS(self) -> list[str]:
        v = (self.CORS_ORIGINS_RAW or "").strip()
        if not v:
            return []
        if v.startswith("["):
            import json
            try:
                return json.loads(v)
            except Exception:
                pass
        return [o.strip() for o in v.split(",") if o.strip()]

    @model_validator(mode="after")
    def reject_default_secret_in_prod(self) -> "Settings":
        # In production the JWT signing key MUST be overridden. Fail fast
        # rather than silently signing tokens with a publicly-known default.
        if (
            self.ENVIRONMENT.lower() == "production"
            and self.SECRET_KEY == "changeme-use-openssl-rand-hex-32"
        ):
            raise ValueError(
                "SECRET_KEY must be set to a strong random value in production "
                "(e.g. `openssl rand -hex 32`); the built-in default is not permitted."
            )
        return self


settings = Settings()
