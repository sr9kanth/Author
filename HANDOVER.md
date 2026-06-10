# AIP — Assessment Intelligence Platform: Handover Document

> **For Claude Code on the web**: Start a session at https://code.claude.com, connect the
> `sr9kanth/Author` repository, and open this file first. The active branch is
> `claude/amazing-turing-8hAH3`. All commands below assume the repo root unless stated otherwise.

---

## Current State (June 2026)

The platform is **fully operational locally via Docker Compose**. All core features are
working end-to-end: auth, knowledge ingestion, AI generation, review workflow, repository,
stimuli, prompt governance, blueprint coverage/gap analysis, batches, metadata dimensions,
settings/LLM key management, and the dashboard.

Run it with:

```bash
cp .env.example .env   # then add your API key(s)
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| MinIO console | http://localhost:9001 (minioadmin / minioadmin) |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js 14 Frontend                   │
│  Dashboard │ Knowledge │ Frameworks │ Generate │ Review  │
│  Repository │ Stimuli │ Prompts │ Blueprint │ Batches    │
│  Metadata │ Settings                                     │
└──────────────────────┬───────────────────────────────────┘
                       │ /api/proxy/* (same-origin Route Handler)
┌──────────────────────▼───────────────────────────────────┐
│                   FastAPI Backend                        │
│  auth │ knowledge │ frameworks │ generation │ quality    │
│  workflow │ repository │ stimuli │ prompts │ blueprint   │
│  batches │ metadata │ settings │ orchestration │ assembly│
└──────────┬────────────────────────────┬─────────────────┘
           │ SQLAlchemy 2.0 async        │ LiteLLM
┌──────────▼──────────┐       ┌─────────▼───────────────────┐
│  PostgreSQL 16       │       │  Claude / OpenAI / Gemini /  │
│  + pgvector          │       │  DeepSeek / Ollama           │
└─────────────────────┘       └─────────────────────────────┘
           │ Celery tasks
┌──────────▼──────────┐       ┌─────────────────────────────┐
│  Redis 7             │       │  MinIO (S3-compatible)       │
└─────────────────────┘       └─────────────────────────────┘
```

**Key networking detail**: The frontend never calls the backend cross-origin in production.
All API calls go through the same-origin proxy Route Handler at
`frontend/src/app/api/proxy/[...path]/route.ts`. This handler reads `BACKEND_URL` at
**request time** (not at Next.js build time), so the backend URL can be changed without
rebuilding the frontend image.

**Migrations**: `backend/start.sh` runs `alembic upgrade head` on every boot. All
migrations are idempotent-guarded. The chain is now linear:
`0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007 → 0007b → 0008 → 0008b → 0010`
(duplicate revision IDs were linearized). Never need to run them manually in normal usage.

---

## Repository Structure

```
Author/
├── backend/
│   ├── app/
│   │   ├── main.py                        # FastAPI app, CORS, router registration, /health
│   │   ├── core/
│   │   │   ├── config.py                  # All env vars (Pydantic Settings)
│   │   │   ├── database.py                # Async SQLAlchemy engine
│   │   │   └── deps.py                    # FastAPI DI (get_db, get_current_user)
│   │   ├── modules/
│   │   │   ├── auth/                      # Users, JWT login/register/refresh
│   │   │   ├── knowledge/                 # Document upload + AI extraction
│   │   │   ├── frameworks/                # Competency frameworks + Item Authoring Guides
│   │   │   ├── generation/                # AI generation jobs + generated content
│   │   │   ├── quality/                   # Quality validation engine
│   │   │   ├── workflow/                  # Review state machine
│   │   │   ├── repository/                # Approved items + search + CSV import + QTI export
│   │   │   ├── stimuli/                   # Shared passages / case studies
│   │   │   ├── prompts/                   # Versioned prompt templates (prompt governance)
│   │   │   ├── blueprint/                 # Coverage targets + gap analysis
│   │   │   ├── batches/                   # Named batches of generation jobs
│   │   │   ├── metadata/                  # Custom metadata dimension admin
│   │   │   ├── settings/                  # App settings + encrypted LLM API keys
│   │   │   ├── assembly/                  # Assessment package assembly
│   │   │   └── orchestration/             # LiteLLM multi-provider AI service + usage logs
│   │   ├── agents/
│   │   │   └── assessment_agent.py        # Generates questions via LiteLLM
│   │   └── workers/
│   │       ├── celery_app.py              # Celery configuration
│   │       └── tasks.py                   # Celery tasks (knowledge, generation, quality)
│   ├── alembic/
│   │   └── versions/                      # Migrations 0001 … 0010 (linear chain)
│   ├── start.sh                           # Runs alembic upgrade head then uvicorn
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── api/proxy/[...path]/
│       │   │   └── route.ts               # Runtime proxy — reads BACKEND_URL per-request
│       │   ├── (auth)/login/              # Public login page
│       │   └── (dashboard)/              # Protected route group
│       │       ├── layout.tsx             # Sidebar + Topbar layout
│       │       ├── dashboard/             # Stats cards + activity feed
│       │       ├── knowledge/             # Upload zone + asset list + auto-poll
│       │       ├── frameworks/            # Framework CRUD + Item Authoring Guides UI
│       │       ├── generate/              # Generation job form + progress polling
│       │       ├── review/                # Split-panel review UI
│       │       ├── repository/            # Item bank + search/filters + CSV import + QTI export
│       │       ├── stimuli/               # Stimuli CRUD page
│       │       ├── prompts/               # Prompt template governance page
│       │       ├── blueprint/             # Coverage targets + gap analysis page
│       │       ├── batches/               # Generation job batches page
│       │       ├── metadata/              # Metadata dimension admin
│       │       └── settings/              # API key management
│       ├── components/
│       │   ├── ui/                        # Design system primitives
│       │   ├── layout/
│       │   │   ├── sidebar.tsx            # Dark sidebar + real storage usage meter
│       │   │   └── topbar.tsx             # Sticky topbar, breadcrumb, dark mode toggle
│       │   └── features/                  # Feature-specific components
│       └── lib/
│           ├── api.ts                     # Axios client
│           ├── auth.ts                    # Token storage, login/logout helpers
│           └── utils.ts
│
├── docker-compose.yml                     # Full local stack
├── .env.example                           # Environment variable template
└── scripts/create-admin.sh               # Helper to POST an admin user
```

---

## Feature Inventory

### Auth
- JWT login / register / refresh with bcrypt password hashing
- User roles: `administrator`, `assessment_manager`, `author`, `reviewer`, `auditor`, `read_only`
- Refresh token stored in `localStorage`; access token attached to every request

### Knowledge Base
- Upload documents: PDF, DOCX, PPTX, CSV, Markdown, HTML, plain text, URL
- Celery worker (`process_knowledge_asset` task) extracts topics, concepts, learning
  outcomes, and keywords via AI
- pgvector RAG pipeline with 3-tier retrieval degradation:
  1. Vector similarity search (requires embedding key)
  2. Full-text keyword search
  3. Returns all assets as fallback
- Knowledge page auto-polls while assets are in `processing` state
- Sidebar shows real storage usage (fetches actual `file_size` totals from the backend)
- **Hierarchical numbered topic tree** per asset with Gen badges
- Detail panel tabs: **Content** (topic tree) / **Sources** / **Keywords** / **Graph**
- **AI-generated concept graph** per asset — nodes/edges SVG visualization, cached in the
  `content_graph` column

### Frameworks
- CRUD for competency frameworks (Framework → Domain → Competency → Skill → LearningOutcome)
- **Item Authoring Guides** per framework — free-text writing guidance injected into every
  generation system prompt when that framework is selected
- Guides UI on the frameworks page: add / toggle active / delete

### Generation
- Create a generation job with inline params — no pre-created `AssessmentConfiguration`
  required:
  - `framework_id`, `question_count`, `question_types`, `difficulty_levels`,
    `cognitive_levels`, `reading_level`, `instructions`
- **Knowledge source picker**: select which indexed documents ground the questions; a
  warning is shown when none are selected (general-knowledge-only mode)
- **Stimulus / scenario picker**: link a shared passage or case study to the job; all
  generated questions reference it
- **AI model selector**: only models with a configured API key are shown as active; others
  are greyed out
- Framework alignment and Item Authoring Guide baked into the generation system prompt
- Real progress polling with 3-minute timeout; error reason surfaced to the UI on failure
- Reliability: weighted quality scoring, LLM validators, circuit breaker, 3-attempt
  exponential-backoff retry logic
- Active prompt template (Prompts module) overrides the hardcoded generation prompt, with
  fallback to the hardcoded one
- Token usage tracked per job: `input_tokens`, `output_tokens`, `cost_usd` on
  `generation_jobs`
- JSON fence stripping + control character sanitization on all AI responses

### Review
- Split-panel UI: question list on the left, question detail on the right
- Status filters: All / New / Validated / Done
- Stimulus callout shown above any question linked to a stimulus
- Approve / reject per question via `PATCH /generation/contents/{id}`
- **Reviewer assignment**: assign questions to specific reviewers; "My queue" filter
- **Separation of duties**: authors cannot approve/reject their own questions — backend
  returns 403, UI disables the buttons and shows a warning
- **Review comments** saved with approve/reject (`review_comment`, `reviewed_by_id`)
- **Distractor analysis panel**: per-wrong-option rationale + the misconception targeted
- Approve sets the content status correctly; the workflow transition is optional (no more
  "Workflow not found" errors)

### Repository
- Approved items list with Bloom's taxonomy level and difficulty metadata visible
- **CSV question bank import** with in-browser template download
- **QTI 2.1 XML export** of approved items
- **Full-text search** + filters (difficulty, type, cognitive level) with live result count

### Stimuli
- Full CRUD for scenario / passage / case-study stimuli (`/stimuli` endpoints)
- Link a stimulus to a generation job so all questions reference it
- Dedicated Stimuli page + sidebar navigation entry

### Prompts (Prompt Governance)
- Versioned prompt templates with types: `generation`, `quality`, `framework_alignment`
- Activate / deactivate / duplicate templates
- The active template overrides the hardcoded prompt in the generation agent, falling back
  to the hardcoded prompt when none is active

### Blueprint
- Define coverage targets: topic × type × difficulty × cognitive level × count
- Gap analysis against approved items
- "Generate to fill gaps" — creates one generation job per gap

### Batches
- Named batches grouping generation jobs
- Batch stats: approved / rejected / pending
- Re-run rejected items

### Metadata Dimensions
- Admin configurator for custom question metadata dimensions
- Field types: single-select, multi-select, text, number
- Scope toggles (applies to question / stimulus), required flag, allowed values list
- Rendered in the review panel alongside each question

### Settings / LLM Keys
- Settings page with API key management
- Keys are Fernet-encrypted at rest in the `app_settings` database table
- Only models whose provider has a stored key are shown as active in the generation model
  selector; others are greyed out

### Dashboard
- Stats cards: active frameworks, items generated, awaiting review, approval rate
- **Pipeline funnel strip**: Created → Viewed → Refining → In Review → Accepted → Rejected
- **Three donut charts**: by status, by type, by difficulty
- **Token usage**: input/output tokens + cost per job, with totals and averages
- Activity feed of recent events

---

## API Endpoints Summary

### Auth — `/api/v1/auth`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Create user account |
| POST | `/login` | Email + password → access + refresh tokens |
| POST | `/refresh` | Exchange refresh token for new access token |
| GET | `/me` | Get current user profile |
| PATCH | `/me` | Update profile |

### Knowledge — `/api/v1/knowledge`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create asset record |
| POST | `/{asset_id}/upload` | Upload file → triggers `process_knowledge_asset` Celery task |
| GET | `/` | List assets (paginated) |
| GET | `/{asset_id}` | Get single asset |
| PATCH | `/{asset_id}` | Update title/description/status |
| DELETE | `/{asset_id}` | Delete asset |

### Frameworks — `/api/v1/frameworks`
Hierarchical: Framework → Domain → Competency → Skill → LearningOutcome  
Includes sub-routes for Item Authoring Guides (`/frameworks/{id}/guides`).

### Generation — `/api/v1/generation`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/jobs` | Create generation job → triggers `run_generation_job` Celery task |
| GET | `/jobs` | List jobs |
| GET | `/jobs/{job_id}` | Get job + status |
| GET | `/jobs/{job_id}/contents` | List generated content for job |
| PATCH | `/contents/{content_id}` | Approve / reject / edit content (403 if author self-reviews; saves review comment) |

`generation_jobs` now carries `stimulus_id`, `input_tokens`, `output_tokens`, `cost_usd`.
`generated_contents` now carries `assigned_reviewer_id`, `reviewed_by_id`, `review_comment`.

### Stimuli — `/api/v1/stimuli`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create stimulus |
| GET | `/` | List stimuli |
| GET | `/{stimulus_id}` | Get stimulus |
| PATCH | `/{stimulus_id}` | Update stimulus |
| DELETE | `/{stimulus_id}` | Delete stimulus |

### Prompts — `/api/v1/prompts`
Versioned prompt templates (`generation` / `quality` / `framework_alignment` types):
create, list, update, activate/deactivate, duplicate, delete.

### Blueprint — `/api/v1/blueprint`
Coverage targets CRUD, gap analysis against approved items, and "generate to fill gaps"
(creates a generation job per gap).

### Batches — `/api/v1/batches`
Batch CRUD, batch stats (approved/rejected/pending), re-run rejected items.

### Metadata — `/api/v1/metadata`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/dimensions` | Create dimension |
| GET | `/dimensions` | List dimensions |
| PATCH | `/dimensions/{id}` | Update dimension |
| DELETE | `/dimensions/{id}` | Delete dimension |

### Settings — `/api/v1/settings`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all settings (keys redacted) |
| PUT | `/{key}` | Set a setting value (e.g. an API key) |
| DELETE | `/{key}` | Remove a setting value |

### Repository — `/api/v1/repository`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Promote content to repository |
| GET | `/` | List repository items |
| GET | `/{item_id}` | Get repository item |
| POST | `/import` | CSV import of question bank items (template downloadable in-browser) |
| GET | `/export/qti` | QTI 2.1 XML export of approved items |

Listing supports full-text search and difficulty/type/cognitive-level filters.

### Orchestration — `/api/v1/orchestration`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/models` | List available LLM providers/models (active vs greyed) |

---

## Celery Tasks

All tasks live in `backend/app/workers/tasks.py`.

| Task | Triggered by | What it does |
|------|-------------|--------------|
| `process_knowledge_asset` | File upload | Downloads from S3, extracts text, runs AI analysis, updates asset topics/concepts/outcomes/keywords, generates pgvector embeddings |
| `run_generation_job` | Generation job create | Loads framework + knowledge context + stimulus, calls `AssessmentAgent`, persists `GeneratedContent` records |
| `run_quality_validation` | Quality validate endpoint | Runs 10 validator classes (grammar, bias, ambiguity, hallucination, etc.), stores `QualityValidation` record |

---

## Environment Variables

All variables are declared in `backend/app/core/config.py` (Pydantic Settings).

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql+asyncpg://aip:aip@localhost:5432/aip` | Postgres connection (Railway auto-rewrites `postgres://`) |
| `REDIS_URL` | `redis://localhost:6379/0` | Celery broker + result backend |
| `SECRET_KEY` | `changeme-...` | JWT signing key — **must be overridden in production** |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token TTL |
| `AWS_ACCESS_KEY_ID` | `""` | S3 / MinIO access key |
| `AWS_SECRET_ACCESS_KEY` | `""` | S3 / MinIO secret |
| `AWS_BUCKET_NAME` | `""` | Bucket name (create `aip-assets` locally) |
| `AWS_ENDPOINT_URL` | `""` | Leave blank for AWS S3; set to MinIO URL locally |
| `LITELLM_DEFAULT_MODEL` | `deepseek-chat` | Default generation model |
| `LITELLM_DEFAULT_PROVIDER` | `deepseek` | Default LiteLLM provider |
| `ANTHROPIC_API_KEY` | `""` | Anthropic API key (optional) |
| `OPENAI_API_KEY` | `""` | OpenAI API key (optional, also needed for embeddings) |
| `GEMINI_API_KEY` | `""` | Google Gemini API key (optional) |
| `DEEPSEEK_API_KEY` | `""` | DeepSeek API key (optional) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_ENABLED` | `false` | Set `true` when a reachable Ollama server is configured |
| `AI_REQUEST_TIMEOUT` | `60` | Seconds before an AI call is aborted |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | pgvector embedding model |
| `EMBEDDING_DIM` | `1536` | Embedding vector dimension |
| `EMBEDDING_PROVIDER` | `openai` | Provider for embeddings (needs OpenAI-compatible key) |
| `ENVIRONMENT` | `development` | `production` enforces strong `SECRET_KEY` |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated or JSON array of allowed origins |

> **Production note**: the app refuses to start with `ENVIRONMENT=production` and the
> default `SECRET_KEY`. Generate a strong key: `openssl rand -hex 32`.

> **Embeddings note**: if no `OPENAI_API_KEY` is configured, the RAG pipeline degrades
> gracefully to full-text keyword search, then to returning all assets. Vector search is
> only active when `embeddings_enabled` is `True`.

---

## How to Run Locally

### Full stack (recommended)

```bash
cp .env.example .env
# Add at least one AI provider key (DEEPSEEK_API_KEY, OPENAI_API_KEY, etc.)
docker compose up --build
```

On first run, create the MinIO bucket once:
- Open http://localhost:9001, log in (minioadmin / minioadmin), create bucket `aip-assets`.

Create your admin user:
```bash
API_URL="http://localhost:8000" EMAIL="you@example.com" \
  PASSWORD="strong-password" FULL_NAME="You" ./scripts/create-admin.sh
```

### Fully private AI with Ollama

```bash
ollama pull llama3.1:70b    # or llama3.1:8b for speed
```

In `.env`:
```
LITELLM_DEFAULT_PROVIDER=ollama
LITELLM_DEFAULT_MODEL=ollama/llama3.1:70b
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_ENABLED=true
```

Then `docker compose up -d backend celery_worker`.

### Running services individually (native, without Docker)

```bash
# Infrastructure only
docker compose up -d postgres redis minio

# Backend (hot reload)
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Celery worker (separate terminal)
cd backend
celery -A app.workers.celery_app worker --loglevel=info

# Frontend
cd frontend && npm install
echo 'BACKEND_URL=http://localhost:8000' > .env.local
npm run dev
```

---

## How Migrations Work

`backend/start.sh` runs `alembic upgrade head` automatically on every boot before starting
uvicorn. There is no need to run migrations manually in normal usage.

Migrations are written with idempotent guards (checks for existing columns/tables before
altering them). The chain is linear:
`0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007 → 0007b → 0008 → 0008b → 0010`.

If `alembic_version` ends up stamped ahead of the actual schema, add the missing columns
manually, e.g.:
```sql
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS stimulus_id VARCHAR;
```

To run manually:
```bash
cd backend
alembic upgrade head
```

To target a different database (e.g. production from local):
```bash
ALEMBIC_DB_URL="postgresql+asyncpg://..." alembic upgrade head
```

---

## Known Quirks

- **Next.js proxy reads `BACKEND_URL` at runtime, not build time.** The Route Handler at
  `frontend/src/app/api/proxy/[...path]/route.ts` calls `process.env.BACKEND_URL` inside
  the handler function body. This means you can update `BACKEND_URL` without rebuilding the
  frontend container — but it also means the variable must be set in the runtime environment
  (not just at build time in Docker args).

- **Celery worker must have the same env vars as the backend.** The worker needs
  `DATABASE_URL`, `REDIS_URL`, all `AWS_*` vars, and all AI provider keys. If the worker is
  run as a separate Docker service (or separately on Railway), copy the full env set.

- **Embeddings require an OpenAI-compatible key.** Without `OPENAI_API_KEY`, the RAG
  pipeline falls back to full-text search silently. This is intentional; generation still
  works, just with less precise knowledge grounding.

- **Alembic chain is linearized.** The migration chain is now
  `0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007 → 0007b → 0008 → 0008b → 0010` —
  duplicate revision IDs that previously existed were linearized. If `alembic_version` is
  stamped ahead of the actual schema, add missing columns manually via psql:
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`.

- **JSON parser sanitizes control characters from AI responses.** DeepSeek embeds raw
  newlines inside JSON strings; the parser strips/escapes control characters before
  decoding.

- **New columns to be aware of**: `generation_jobs` has `stimulus_id`, `input_tokens`,
  `output_tokens`, `cost_usd`; `generated_contents` has `assigned_reviewer_id`,
  `reviewed_by_id`, `review_comment`.

- **`CORS_ORIGINS` is parsed as a raw string.** It accepts either a comma-separated list
  (`http://localhost:3000,https://example.com`) or a JSON array string. Do not rely on
  pydantic-settings auto-decoding JSON env vars for this field.

---

## Remaining Backlog

Done since last revision: ✅ prompt governance (Prompts module), ✅ reviewer assignment +
separation of duties, ✅ QTI 2.1 export, ✅ repository full-text search + filters,
✅ blueprint coverage/gap analysis, ✅ batches, ✅ distractor analysis panel, ✅ concept
graph + topic tree on knowledge assets, ✅ token usage / cost tracking.

| Item | Notes |
|------|-------|
| Prompt A/B testing | Prompt versioning exists; A/B testing of variants does not |
| QTI 3.0 export | Only QTI 2.1 currently supported |
| Vector / semantic search on repository | Full-text search exists; no semantic search yet |
| RAG embedding pipeline for all providers | Embeddings currently only via OpenAI-compatible endpoint |
| Keycloak OIDC | Stub exists in `frontend/src/lib/auth.ts`; not yet implemented |

---

## Starting a New Claude Code Session on the Web

1. Go to https://code.claude.com
2. Connect the `sr9kanth/Author` GitHub repository
3. When the session starts, Claude will be on a fresh clone — your changes are on `claude/amazing-turing-8hAH3`
4. Say: _"Read HANDOVER.md and continue development on branch `claude/amazing-turing-8hAH3`"_
