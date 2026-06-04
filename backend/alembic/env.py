"""Alembic environment configuration for async SQLAlchemy."""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool

# Import all models so Alembic can detect them
from app.core.database import Base  # noqa: F401
import app.modules.auth.models  # noqa: F401
import app.modules.knowledge.models  # noqa: F401
import app.modules.frameworks.models  # noqa: F401
import app.modules.assessment_config.models  # noqa: F401
import app.modules.generation.models  # noqa: F401
import app.modules.orchestration.models  # noqa: F401
import app.modules.quality.models  # noqa: F401
import app.modules.workflow.models  # noqa: F401
import app.modules.repository.models  # noqa: F401
import app.modules.assembly.models  # noqa: F401

config = context.config

# Allow overriding the database URL via environment variable (harmless in prod).
import os

_override_url = os.getenv("ALEMBIC_DB_URL")
if not _override_url:
    # Fall back to the application's configured (and normalized) DATABASE_URL,
    # so migrations target the same DB as the app in any environment.
    try:
        from app.core.config import settings as _settings
        _override_url = _settings.DATABASE_URL
    except Exception:
        _override_url = None
if _override_url:
    config.set_main_option("sqlalchemy.url", _override_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
