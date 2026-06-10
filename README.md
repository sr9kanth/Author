# Assessment Intelligence Platform (AIP)

An AI-powered platform for authoring, reviewing, and managing educational assessment
content at scale. Covers the full lifecycle: knowledge ingestion → AI question generation →
human review → approved item repository.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI 0.115, SQLAlchemy 2.0 async |
| Frontend | Next.js 14 (App Router, TypeScript, Tailwind CSS) |
| Database | PostgreSQL 16 + pgvector |
| Task queue | Celery 5 + Redis 7 |
| Auth | JWT (bcrypt password hashing) |
| Storage | S3-compatible via boto3 (MinIO for local dev) |
| AI | LiteLLM — DeepSeek, Claude, OpenAI, Gemini, Ollama |

## Quick Start

```bash
cp .env.example .env
# Add at least one AI provider key (DEEPSEEK_API_KEY, OPENAI_API_KEY, etc.)
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |

On first run, create a MinIO bucket named `aip-assets` via the console, then create your
admin user:

```bash
API_URL="http://localhost:8000" EMAIL="you@example.com" \
  PASSWORD="strong-password" FULL_NAME="You" ./scripts/create-admin.sh
```

Alembic migrations run automatically on backend boot — no manual migration step needed.

## Architecture

The frontend routes all API calls through a same-origin proxy Route Handler
(`/api/proxy/*`), which forwards to the backend at `BACKEND_URL`. This eliminates
cross-origin issues and allows the backend URL to be changed without rebuilding the
frontend.

```
Next.js 14  →  /api/proxy/*  →  FastAPI backend  →  PostgreSQL + pgvector
                                       │
                               Celery worker  →  Redis
                                       │
                               LiteLLM  →  Claude / OpenAI / Gemini / DeepSeek / Ollama
```

## Features

- **Knowledge base** — upload PDF, DOCX, PPTX, CSV, Markdown; AI extracts topics,
  concepts, and learning outcomes; pgvector RAG grounds generation
- **Frameworks** — competency framework hierarchy with Item Authoring Guides injected into
  generation prompts
- **Generation** — create jobs with inline params (question type, difficulty, cognitive
  level, reading level, instructions); pick knowledge sources (with a warning when none
  are selected — general-knowledge-only mode) and an optional stimulus so all questions
  are grounded in it; per-framework Item Authoring Guides injected into the system prompt
- **Review** — split-panel approve/reject UI with status filters; stimulus callout shown
  above linked questions; reviewer assignment with a "My queue" filter; separation of
  duties (authors cannot approve/reject their own questions); review comments saved with
  decisions; distractor analysis panel (per-wrong-option rationale + misconception
  targeted)
- **Repository** — approved item bank with Bloom/difficulty metadata; full-text search +
  difficulty/type/cognitive-level filters with live result count; CSV import with
  downloadable template; QTI 2.1 XML export of approved items
- **Stimuli** — shared passages / case studies linked to generation jobs and review items
- **Prompts (prompt governance)** — versioned prompt templates (generation / quality /
  framework_alignment); activate/deactivate, duplicate; the active template overrides the
  hardcoded generation prompt with fallback
- **Blueprint** — coverage targets (topic × type × difficulty × cognitive level × count),
  gap analysis against approved items, "generate to fill gaps" creating jobs per gap
- **Batches** — named batches grouping generation jobs, batch stats
  (approved/rejected/pending), re-run rejected items
- **Metadata dimensions** — admin-configurable custom fields (single/multi select, text,
  number; scopes; dictionary values) rendered in the review panel
- **Settings** — Fernet-encrypted API key storage; only providers with a stored key appear
  active in the model selector
- **Dashboard** — pipeline funnel strip (Created → Viewed → Refining → In Review →
  Accepted → Rejected); donut charts by status, type, and difficulty; token usage tracking
  (input/output tokens + cost per job, totals and averages); stats cards + activity feed
- **Knowledge intelligence** — hierarchical numbered topic tree per asset with Gen badges;
  detail panel tabs (Content / Sources / Keywords / Graph); AI-generated concept graph per
  asset (SVG node/edge visualization, cached per asset)

## Running Tests

```bash
cd backend
pytest tests/ -v                        # full suite (needs Postgres + Redis)
pytest tests/test_security.py -v        # DB-free auth/bcrypt unit tests
```

## Detailed Documentation

See [HANDOVER.md](HANDOVER.md) for:
- Full architecture and repository structure
- Complete API endpoint reference
- All environment variables and their defaults
- Migration details
- Known quirks (proxy runtime env, Celery env vars, embeddings fallback)
- Remaining backlog items
