# Assessment Intelligence Platform (AIP)

An AI-powered platform for authoring, reviewing, and managing educational assessment content at scale.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12 + FastAPI (async) |
| Frontend | Next.js 14 (App Router, TypeScript, Tailwind CSS) |
| Database | PostgreSQL 16 + pgvector |
| Queue | Celery 5 + Redis 7 |
| Auth | JWT (bcrypt password hashing; Keycloak integration stubs) |
| Storage | S3-compatible via boto3 (MinIO for local dev) |
| AI Orchestration | LiteLLM (Claude, OpenAI, Gemini, DeepSeek, Ollama) |

## Prerequisites

- Docker & Docker Compose
- Python 3.12+ (for local backend dev)
- Node.js 20+ (for local frontend dev)

## Quick Start

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env and add your API keys
```

### 2. Start all services

```bash
docker compose up -d --build
```

Database setup runs automatically on backend boot (`backend/start.sh`):
Alembic migrations → `create_missing_tables()` for any new feature modules →
admin user seed. No manual migration step is required for local development.

> **Production note:** the app refuses to start with `ENVIRONMENT=production`
> unless a strong `SECRET_KEY` is set (e.g. `openssl rand -hex 32`). Local
> compose runs as `development` with a throwaway key.

### 3. Access the platform

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |

## Local Development

```bash
# Backend (hot-reload)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload

# Frontend (hot-reload)
cd frontend
npm install
cp .env.example .env.local
npm run dev

# Celery worker
cd backend
celery -A app.workers.celery_app worker --loglevel=debug
```

## Frontend ↔ Backend networking

The frontend never calls the backend cross-origin. All API calls go to a
**same-origin proxy** path (`/api/proxy/v1/*`) which the Next.js server
rewrites to the backend (`next.config.mjs` → `BACKEND_URL`, default
`http://backend:8000` in Docker). This eliminates CORS as a failure mode for
create/upload/fetch. Backend CORS is still configured (allow-list via
`CORS_ORIGINS`) for direct API/tooling access.

## Running Tests

```bash
cd backend
pytest tests/ -v            # full suite (needs Postgres + Redis)
pytest tests/test_security.py -v   # DB-free auth/bcrypt unit tests
```

CI (`.github/workflows/deploy.yml`) runs on **every branch**: the backend
suite against Postgres + Redis, and the frontend `tsc --noEmit` + build.
Smoke tests cover login, framework/knowledge/generation creation, and
password hashing so a dependency bump can't silently break auth.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Next.js Frontend                   │
│  Dashboard │ Knowledge │ Generate │ Review │ Assembly│
└─────────────────────┬───────────────────────────────┘
                      │ REST API
┌─────────────────────▼───────────────────────────────┐
│                FastAPI Backend                      │
│  auth │ knowledge │ frameworks │ generation │ quality│
│  orchestration │ workflow │ repository │ assembly   │
└─────────┬──────────────────────────┬────────────────┘
          │ SQLAlchemy async         │ LiteLLM
┌─────────▼──────┐          ┌────────▼────────────────┐
│  PostgreSQL 16  │          │  Claude / OpenAI /       │
│  + pgvector     │          │  Gemini / Ollama         │
└────────────────┘          └─────────────────────────┘
          │ Celery tasks
┌─────────▼──────┐          ┌─────────────────────────┐
│     Redis 7    │          │  MinIO (S3-compatible)   │
└────────────────┘          └─────────────────────────┘
```

## Module Reference

- **auth** – User registration, JWT login/refresh, role-based access
- **knowledge** – Document upload, S3 storage, AI-powered content extraction
- **frameworks** – Competency framework hierarchy (Framework → Domain → Competency → Skill → LearningOutcome)
- **assessment_config** – Question type mix, difficulty, and cognitive level configuration
- **generation** – AI generation jobs dispatched via Celery
- **orchestration** – LiteLLM wrapper with failover, cost tracking, and multi-provider support
- **quality** – 10 validator classes (grammar, bias, ambiguity, hallucination, etc.)
- **workflow** – State machine (draft → generated → validated → under_review → approved → published → archived)
- **repository** – Published item library
- **assembly** – Final assessment package assembly and export
