"""Celery application initialisation."""

from celery import Celery
from celery.signals import worker_process_init

from app.core.config import settings

celery_app = Celery(
    "aip",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=86400,  # 24 hours
)


@worker_process_init.connect
def _reset_db_pool(**_kwargs) -> None:
    """Dispose the async DB connection pool inherited from the parent process.

    Celery's prefork pool forks worker children; an asyncpg pool created at
    import time in the parent would be shared across forks and corrupt the
    connection protocol (hangs / InterfaceError). Disposing here forces each
    child to build its own pool on first use.
    """
    from app.core.database import async_engine

    async_engine.sync_engine.pool.dispose()
