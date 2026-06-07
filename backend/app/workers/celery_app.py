"""Celery application initialisation."""

from celery import Celery

from app.core.config import settings

# Register every ORM model on Base.metadata so the worker's mapper registry can
# resolve string-based relationships (e.g. GenerationJob -> AssessmentConfiguration)
# when tasks query the DB. Without this, a worker that only imports a subset of
# models raises InvalidRequestError: "failed to locate a name".
import app.models  # noqa: E402,F401

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
