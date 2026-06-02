# Assessment Intelligence Platform (AIP)

An AI-powered platform for authoring, reviewing, and managing educational assessment content at scale.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12 + FastAPI (async) |
| Frontend | Next.js 14 (App Router, TypeScript, Tailwind CSS) |
| Database | PostgreSQL 16 + pgvector |
| Queue | Celery 5 + Redis 7 |
| Auth | JWT (with Keycloak integration stubs) |
| Storage | S3-compatible via boto3 (MinIO for local dev) |
| AI Orchestration | LiteLLM (Claude, OpenAI, Gemini, Ollama) |

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
docker compose up -d
```

### 3. Apply database migrations

```bash
docker compose exec backend alembic upgrade head
```

### 4. Access the platform

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

## Running Tests

```bash
cd backend
pytest tests/ -v
```

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
