#!/bin/sh
set -e
# Try Alembic migration first; if it fails, fall back to direct table creation.
alembic upgrade head || {
    echo "WARNING: alembic upgrade failed; falling back to init_db()"
    python -c "
import asyncio
from app.core.database import init_db
asyncio.run(init_db())
print('init_db() complete')
"
}
# Seed admin user (no-op if already exists)
python seed_admin.py || echo "WARNING: seed_admin failed"

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips="*"
