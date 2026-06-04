#!/bin/sh
set -e
# Apply database migrations before starting the API (idempotent).
alembic upgrade head || echo "WARNING: alembic upgrade failed; starting anyway"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
