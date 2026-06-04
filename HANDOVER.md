# AIP — Assessment Intelligence Platform: Handover Document

> **For Claude Code on the web**: Start a session at https://code.claude.com, connect the `sr9kanth/Author` repository, and open this file first. The active branch is `claude/amazing-turing-8hAH3`. All commands below assume the repo root unless stated otherwise.

---

## Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://writer-two-iota.vercel.app |
| Backend API | https://author-production.up.railway.app |
| API Docs (Swagger) | https://author-production.up.railway.app/docs |

**Repository**: `sr9kanth/Author`  
**Active branch**: `claude/amazing-turing-8hAH3`

---

## Deployment Status (as of 2026-06-04)

**The live deployment is working: auth, DB, and the UI are all up.**

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend (Vercel) | ✅ Live & styled | Tailwind/postcss fixed earlier |
| Backend (Railway) | ✅ Live | All startup crashes resolved |
| PostgreSQL (Railway) | ✅ Connected | `DATABASE_URL = ${{Postgres.DATABASE_URL}}` set on backend |
| Migrations | ✅ Applied on boot | `start.sh` runs `alembic upgrade head` |
| Admin user | ✅ Created | `sr9kanth@gmail.com` (administrator), login verified |
| Redis / Celery worker | ⛔ **Not set up** | Railway usage expired — see options below |
| S3 file storage | ⚠️ Vars set, untested | AWS creds on backend; upload flow not yet exercised |

### Fixes landed this session (all on `claude/amazing-turing-8hAH3`)
| Commit | Fix |
|--------|-----|
| `fa04eb2` | Rewrite `postgres://` → `postgresql+asyncpg://` for Railway |
| `4e6075f` | CORS: hardcode Vercel origin so OPTIONS preflights pass |
| `f8ab24c` | Lazy-import Celery task so the web app starts without Redis |
| `d2ecefe` | Parse `CORS_ORIGINS` as a raw string (was crashing pydantic JSON decode at startup) |
| `12bdc35` | Run `alembic upgrade head` on boot; alembic defaults to app `DATABASE_URL` |
| `32971fa` | Pin `bcrypt==4.0.1` + truncate passwords to 72 bytes (passlib 1.7.4 compat) |

### What's blocked & why
**Redis + Celery worker** can't be added on Railway because the account's usage/trial expired.
Background jobs (knowledge extraction, question generation, quality validation) need a broker
+ worker. Two ways forward — see **"Background jobs without Railway Redis"** and
**"Fully Local Setup"** below. **Recommendation: run the whole stack locally** (next section) —
it sidesteps usage limits entirely, keeps data private, and lets the M1 Max run a local LLM.

---

## What this project is

AIP is a full-stack AI-native platform for creating, managing, validating, and assembling assessment content (exam questions, competency frameworks, learning outcomes). Built for organisations that need structured, auditable, AI-assisted assessment authoring.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI 0.115, SQLAlchemy 2.0 async |
| Database | PostgreSQL + pgvector (via Railway) |
| Task queue | Celery 5.4 + Redis (via Railway) |
| AI | LiteLLM — DeepSeek by default, supports OpenAI, Anthropic, Gemini, Ollama |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| File storage | AWS S3 / MinIO (boto3) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Lucide icons |
| Backend deploy | Railway (Dockerfile build from repo root) |
| Frontend deploy | Vercel (root directory: `frontend/`) |

---

## Repository Structure

```
Author/
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI app, CORS, router registration, /health
│   │   ├── core/
│   │   │   ├── config.py             # All env vars (Pydantic Settings)
│   │   │   ├── database.py           # Async SQLAlchemy engine + init_db()
│   │   │   └── deps.py               # FastAPI dependency injection (get_db, get_current_user)
│   │   ├── modules/
│   │   │   ├── auth/                 # Users, JWT login/register/refresh
│   │   │   ├── knowledge/            # Knowledge asset upload + AI extraction
│   │   │   ├── frameworks/           # Competency frameworks, domains, skills, outcomes
│   │   │   ├── assessment_config/    # Assessment configuration templates
│   │   │   ├── generation/           # AI generation jobs + generated content
│   │   │   ├── quality/              # Quality validation engine
│   │   │   ├── workflow/             # Review workflow state machine
│   │   │   ├── repository/           # Approved item repository
│   │   │   ├── assembly/             # Assessment package assembly
│   │   │   └── orchestration/        # LiteLLM multi-provider AI service + usage logs
│   │   ├── agents/
│   │   │   └── assessment_agent.py   # AssessmentAgent: generates questions via LiteLLM
│   │   └── workers/
│   │       ├── celery_app.py         # Celery configuration
│   │       └── tasks.py              # 3 Celery tasks (see below)
│   ├── alembic/                      # Migration framework (versions/ is currently empty)
│   ├── tests/
│   ├── Dockerfile                    # python:3.11-slim, copies backend/, runs start.sh
│   ├── start.sh                      # exec uvicorn app.main:app --port "${PORT:-8000}"
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/         # /login — public
│   │   │   └── (dashboard)/          # Protected route group
│   │   │       ├── layout.tsx        # Sidebar + Topbar layout
│   │   │       ├── dashboard/        # /dashboard — stats, chart, activity, review queue
│   │   │       ├── frameworks/       # /frameworks — sortable table with search/filter
│   │   │       ├── knowledge/        # /knowledge — upload zone + asset list
│   │   │       ├── generate/         # /generate — job config form + progress
│   │   │       ├── review/           # /review — split-panel review UI
│   │   │       ├── repository/       # /repository — item bank with grid/list toggle
│   │   │       ├── assembly/         # /assembly — drag-and-drop package builder
│   │   │       └── configurations/   # /configurations
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── button.tsx        # Button variants: primary/secondary/ghost/danger
│   │   │   │   ├── badge.tsx         # StatusBadge (5 content statuses) + Tag
│   │   │   │   ├── card.tsx          # CARD constant (use as className)
│   │   │   │   ├── input.tsx         # Input + INPUT_CLS constant
│   │   │   │   └── index.tsx         # StatsCard, PageHeader, EmptyState, SearchInput, Segmented, FileUploadZone
│   │   │   ├── layout/
│   │   │   │   ├── sidebar.tsx       # Dark #0C0C0F sidebar, section groups, storage meter
│   │   │   │   └── topbar.tsx        # Sticky topbar, breadcrumb, search, dark mode toggle
│   │   │   └── features/
│   │   │       ├── knowledge/upload-form.tsx
│   │   │       ├── generation/generation-form.tsx
│   │   │       └── review/review-panel.tsx
│   │   ├── lib/
│   │   │   ├── api.ts                # Axios client pointing at NEXT_PUBLIC_API_URL
│   │   │   ├── auth.ts               # Token storage, login/logout helpers
│   │   │   └── utils.ts
│   │   └── types/index.ts            # All TypeScript interfaces
│   ├── next.config.mjs               # output: standalone, /api/proxy/* rewrite
│   ├── vercel.json                   # Security headers
│   └── package.json
│
├── railway.json                      # Railway build config → backend/Dockerfile
├── railway.toml                      # Same (Railway reads both)
├── vercel.json                       # Root vercel.json for monorepo (frontend only)
└── docker-compose.yml                # Local full-stack dev (postgres, redis, backend, frontend)
```

---

## Design System

The frontend uses a warm Notion-ish SaaS design system:

- **Paper surface**: `bg-[var(--paper)]` — `#fafaf9` light / `#141316` dark
- **Sidebar**: `#0C0C0F` (always dark)
- **Brand**: indigo (`#6366f1`) with violet accents
- **Cards**: `CARD` constant from `components/ui/card.tsx`
- **Dark mode**: Tailwind `class` strategy — toggled by `document.documentElement.classList.toggle("dark")`
- **Icons**: Lucide React throughout

**StatusBadge taxonomy** (in `badge.tsx`):
- `draft` → stone, `generated` → violet, `validated` → amber, `approved` → emerald, `published` → sky, `archived` → slate

---

## Backend Modules & API Endpoints

### Auth — `/api/v1/auth`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Create user account |
| POST | `/login` | Email + password → access + refresh tokens |
| POST | `/refresh` | Exchange refresh token for new access token |
| GET | `/me` | Get current user profile |
| PATCH | `/me` | Update profile |

**User roles**: `administrator`, `assessment_manager`, `author`, `reviewer`, `auditor`, `read_only`

---

### Knowledge — `/api/v1/knowledge`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create asset record |
| POST | `/{asset_id}/upload` | Upload file → triggers `process_knowledge_asset` Celery task |
| GET | `/` | List assets (paginated) |
| GET | `/{asset_id}` | Get single asset |
| PATCH | `/{asset_id}` | Update title/description/status |
| DELETE | `/{asset_id}` | Delete asset |

**Content types**: pdf, docx, pptx, xlsx, csv, html, url, markdown, text  
**Statuses**: uploaded → processing → processed / failed

---

### Frameworks — `/api/v1/frameworks`
Hierarchical: Framework → Domain → Competency → Skill → LearningOutcome

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create framework |
| GET | `/` | List frameworks (paginated) |
| GET | `/{framework_id}` | Get framework |
| DELETE | `/{framework_id}` | Delete framework |

---

### Assessment Config — `/api/v1/configurations`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create configuration |
| GET | `/` | List configurations |
| GET | `/{config_id}` | Get configuration |
| PATCH | `/{config_id}` | Update configuration |
| DELETE | `/{config_id}` | Delete configuration |

Configuration parameters: question_types, difficulty_levels, cognitive_levels, question_count, reading_level, language, audience, jurisdiction, duration_minutes, framework_id

---

### Generation — `/api/v1/generation`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/jobs` | Create generation job → triggers `run_generation_job` Celery task |
| GET | `/jobs` | List jobs (paginated) |
| GET | `/jobs/{job_id}` | Get job + status |
| GET | `/jobs/{job_id}/contents` | List generated content for job |
| PATCH | `/contents/{content_id}` | Update content body/status |

**Job statuses**: pending → running → completed / failed  
**Content statuses**: draft → generated → validated → under_review → approved → published → archived

---

### Quality — `/api/v1/quality`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/validate` | Queue validation → triggers `run_quality_validation` Celery task |
| GET | `/content/{content_id}` | Get validation results for content |

---

### Workflow — `/api/v1/workflow`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/content/{content_id}` | Get workflow state for content |
| POST | `/content/{content_id}/transition` | Transition state (with validation) |
| GET | `/content/{content_id}/events` | Get audit trail of transitions |
| POST | `/content/{content_id}/comments` | Add review comment |

**State machine**: draft → generated → validated → under_review → approved → published → archived  
Any state can fall back to draft.

---

### Repository — `/api/v1/repository`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Promote content to repository |
| GET | `/` | List repository items (paginated) |
| GET | `/{item_id}` | Get repository item |

---

### Assembly — `/api/v1/assembly`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create assessment package |
| GET | `/` | List packages (paginated) |
| GET | `/{package_id}` | Get package |
| PATCH | `/{package_id}` | Update package |

---

### Orchestration — `/api/v1/orchestration`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/models` | List available LLM providers and models |
| POST | `/complete` | Direct AI completion (used internally by agents) |

---

## Celery Tasks

All tasks in `backend/app/workers/tasks.py`. Each creates its own async DB session internally.

| Task name | Triggered by | What it does |
|-----------|-------------|--------------|
| `tasks.process_knowledge_asset` | File upload endpoint | Downloads from S3, extracts text, runs AI analysis, updates asset topics/concepts/outcomes/keywords |
| `tasks.run_generation_job` | Generation job create | Loads context, calls `AssessmentAgent`, persists `GeneratedContent` records |
| `tasks.run_quality_validation` | Quality validate endpoint | Runs validator suite against content, stores `QualityValidation` record, updates `validation_score` |

---

## AI / LiteLLM Setup

Provider routing is in `backend/app/modules/orchestration/service.py`.

**Default**: DeepSeek (`deepseek-chat`)  
**Supported**: deepseek, anthropic, openai, gemini, ollama  

Model IDs must be prefixed for LiteLLM: `deepseek/deepseek-chat`, `anthropic/claude-opus-4-8`, etc.

The `AssessmentAgent` in `backend/app/agents/assessment_agent.py` handles generation. It takes a context dict and returns structured question JSON.

---

## Environment Variables

### Railway (backend service → Variables tab)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Auto-set by Railway Postgres plugin |
| `REDIS_URL` | Auto-set by Railway Redis plugin |
| `SECRET_KEY` | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DEEPSEEK_API_KEY` | From platform.deepseek.com |
| `CORS_ORIGINS` | `["https://writer-two-iota.vercel.app"]` |
| `ENVIRONMENT` | `production` |
| `AWS_ACCESS_KEY_ID` | S3 or MinIO key (required for file uploads) |
| `AWS_SECRET_ACCESS_KEY` | S3 or MinIO secret |
| `AWS_BUCKET_NAME` | Bucket name |
| `AWS_ENDPOINT_URL` | Leave blank for AWS S3; MinIO URL otherwise |
| `ANTHROPIC_API_KEY` | Optional — Anthropic console |
| `OPENAI_API_KEY` | Optional — OpenAI platform |
| `GEMINI_API_KEY` | Optional — Google AI Studio |

### Vercel (frontend → Settings → Environment Variables)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://author-production.up.railway.app` |

---

## Database

Schema is created automatically via `init_db()` in `backend/app/core/database.py` on startup (`Base.metadata.create_all`). The pgvector extension is also created there.

An **initial Alembic migration** is committed under `backend/alembic/versions/`. To apply migrations in production instead of relying on `create_all`:

```bash
cd backend
alembic upgrade head
```

`alembic/env.py` honors an `ALEMBIC_DB_URL` env var to override the target database.

---

## Completing the Deployment (Dashboard Steps)

These steps require the Railway dashboard and cannot be done from code.

### 1. Add the Celery worker service

The worker runs background jobs (knowledge processing, generation, quality validation). Without it, those features silently never complete.

1. Railway → your project → **+ New** → **GitHub Repo** → select `sr9kanth/Author`
2. Open the new service → **Settings** → **Build** → set **Dockerfile Path** to `backend/Dockerfile` (same as the backend service)
3. **Settings** → **Deploy** → **Custom Start Command**:
   ```
   celery -A app.workers.celery_app worker --loglevel=info
   ```
   (Run inside the backend dir: if needed use `sh -c "cd backend && celery -A app.workers.celery_app worker --loglevel=info"` — but since the Dockerfile WORKDIR is `/app` with backend copied in, the plain command works.)
4. **Variables** tab → add the **same** env vars as the backend service. Critical: `REDIS_URL`, `DATABASE_URL` (reference the shared Postgres/Redis plugins), `SECRET_KEY`, `DEEPSEEK_API_KEY`, and the `AWS_*` vars below.
5. Deploy. Logs should show `celery@... ready.`

A root `Procfile` documents both process types (`web`, `worker`).

### 2. Configure S3 / MinIO (file uploads)

File uploads (`POST /knowledge/{id}/upload`) store to S3 and the worker reads them back. Set these on **both** the backend AND worker services:

| Variable | Value |
|----------|-------|
| `AWS_ACCESS_KEY_ID` | S3 / MinIO access key |
| `AWS_SECRET_ACCESS_KEY` | S3 / MinIO secret |
| `AWS_BUCKET_NAME` | bucket name (must already exist) |
| `AWS_ENDPOINT_URL` | leave blank for AWS S3; set to the MinIO URL otherwise |

Easiest path: create an AWS S3 bucket (any region), generate an IAM key with `s3:PutObject`/`s3:GetObject` on that bucket, and fill in the three values (leave `AWS_ENDPOINT_URL` blank). Alternatively add a MinIO service on Railway and point `AWS_ENDPOINT_URL` at it.

### 3. Create the first admin user — ✅ DONE

The live admin account already exists: `sr9kanth@gmail.com` (administrator), login verified.
To create additional users, run from anywhere with network access to the backend:

```bash
EMAIL="you@example.com" PASSWORD="strong-password" FULL_NAME="Your Name" \
  ./scripts/create-admin.sh
```

This POSTs to `/api/v1/auth/register` with `role: administrator` and verifies login. Then sign in at the frontend `/login`.

> ⚠️ Steps 1 (Celery worker) and the Redis dependency are **blocked on Railway** while the
> account's usage is expired. See **"Deployment Status"** at the top and the **"Fully Local
> Setup"** section for the recommended way forward.

---

## Known Issues & Pending Work

### High priority
| Issue | Location | Status |
|-------|----------|--------|
| Redis + Celery worker | Railway project | **Blocked: Railway usage expired.** Run locally (recommended) or use external Redis — see "Background jobs" section |
| S3 upload untested | Railway env vars | AWS creds set on backend; upload flow not yet exercised end-to-end |
| Knowledge content in generation | `backend/app/workers/tasks.py` | ✅ Done (`a641d68`) — real extracted topics/concepts + S3 fallback now feed the agent |

### Medium priority
| Issue | Location | Fix needed |
|-------|----------|-----------|
| Keycloak OIDC stub | `frontend/src/lib/auth.ts:49,54` | Implement OIDC flow or remove stub |

### Low priority
| Issue | Location | Notes |
|-------|----------|-------|
| Next.js 14.2.13 security warning | `frontend/package.json` | Upgrade to Next.js 15 when ready |
| ESLint 8 deprecated | `frontend/package.json` | Update to ESLint 9 |

---

## Fully Local Setup (recommended — private & no usage limits)

The entire stack is already containerised in `docker-compose.yml`: **Postgres+pgvector,
Redis, MinIO (S3-compatible), FastAPI backend, Celery worker, and the Next.js frontend.**
Everything runs on your machine — no Railway, no Vercel, no cloud usage limits, and your
data never leaves the laptop. Ideal for the M1 Max / 64 GB.

### Prerequisites
- **Docker Desktop** for Mac (Apple Silicon build)
- (Optional, for fully-private AI) **Ollama** — https://ollama.com/download

### One-command start
```bash
# from repo root
cp .env.example .env          # then edit .env (see below)
docker compose up --build
```
This brings up everything. Wait for all health checks to go green, then:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| MinIO console | http://localhost:9001 (user/pass: `minioadmin`/`minioadmin`) |

> The backend container runs `start.sh`, which applies migrations automatically.
> If you run uvicorn manually instead, run `alembic upgrade head` first.

### Create the MinIO bucket (first run only)
The app expects a bucket named `aip-assets`. Create it once:
- Open the MinIO console (http://localhost:9001), log in, **Create Bucket** → `aip-assets`.
- (Or `docker compose exec minio mc mb local/aip-assets` if `mc` is configured.)

### Create your local admin user
```bash
API_URL="http://localhost:8000" EMAIL="you@example.com" \
  PASSWORD="strong-password" FULL_NAME="You" ./scripts/create-admin.sh
```

### `.env` for local
Most defaults in `.env.example` already point at the compose service names. Key choices:
- **AI provider**: for a paid API set `LITELLM_DEFAULT_PROVIDER=deepseek` + `DEEPSEEK_API_KEY=...`.
  For **fully local / private**, use Ollama (next section).
- `CORS_ORIGINS=["http://localhost:3000"]` (already default)
- `SECRET_KEY` — generate with `openssl rand -hex 32`

### Fully-private AI with Ollama (no data leaves your machine)
1. Install Ollama, then pull a strong model the M1 Max can run:
   ```bash
   ollama pull llama3.1:70b      # best quality on 64 GB; or llama3.1:8b for speed
   ```
2. In `.env`:
   ```
   LITELLM_DEFAULT_PROVIDER=ollama
   LITELLM_DEFAULT_MODEL=ollama/llama3.1:70b
   OLLAMA_BASE_URL=http://host.docker.internal:11434
   ```
   (`host.docker.internal` lets the backend container reach Ollama running on the host.)
3. Restart: `docker compose up -d backend celery_worker`.

Now generation, extraction, and validation all run through the local model — **end to end,
fully offline** (except model download).

### Running pieces individually (without Docker)
```bash
# Postgres + Redis + MinIO only (infra), app run natively
docker compose -f docker-compose.dev.yml up -d

# Backend (hot reload)
cd backend && pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Celery worker (separate terminal)
cd backend && celery -A app.workers.celery_app worker --loglevel=info

# Frontend
cd frontend && npm install
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local
npm run dev
```

### Is local better than fighting Railway usage limits?
For this project — **yes, for development and private use.** You get the full pipeline
(including Redis + the Celery worker, which Railway currently blocks), zero cloud cost, and
data privacy. Keep the cloud deploy for sharing a demo URL; do real work locally. The two
share the same codebase and migrations, so you can switch freely.

---

## Background jobs without Railway Redis (cloud-only path)

If you want the **cloud** deploy to run generation without Railway Redis:
1. **External managed Redis** — e.g. Upstash free tier. Create a DB, copy its `rediss://…`
   URL, set `REDIS_URL` on the backend (literal value, not a `${{ }}` reference). Note:
   `rediss://` (TLS) may need a Celery SSL tweak — flag this when revisiting.
2. **Worker host** — Railway still can't run a second worker service while usage is expired.
   Run the worker locally pointed at the cloud Postgres + Upstash Redis, or move generation
   inline (synchronous in the request) as a fallback. Revisit when ready.

---

## Deploying Changes

All deployments are triggered by pushing to `claude/amazing-turing-8hAH3`.

- **Railway** redeploys the backend automatically on push
- **Vercel** redeploys the frontend automatically on push

```bash
git add <files>
git commit -m "your message"
git push origin claude/amazing-turing-8hAH3
```

Monitor:
- Railway build logs: railway.app → project → backend service → Deployments
- Vercel build logs: vercel.com → author project → Deployments

---

## Next Steps (Suggested Priority Order)

Done this session: ✅ admin user, ✅ Alembic initial migration, ✅ frontend wired to live API,
✅ real knowledge content in generation, ✅ DB connected, ✅ all startup crashes fixed.

Remaining / when revisiting:
1. **Stand up the background-job pipeline** — recommended: run the **full stack locally**
   (`docker compose up`) which includes Redis + the worker. See "Fully Local Setup". This is
   the unblock for generation/quality jobs.
2. **(Optional, fully private)** point AI at **Ollama** (`llama3.1:70b`) on the M1 Max — no
   data leaves the machine.
3. **Verify S3 upload** — upload a knowledge asset and confirm the worker extracts it.
4. **Cloud generation (later)** — external Redis (Upstash) + a worker host; mind the
   `rediss://` TLS tweak for Celery.

---

## Starting a New Claude Code Session on the Web

1. Go to https://code.claude.com
2. Connect the `sr9kanth/Author` GitHub repository
3. When the session starts, Claude will be on a fresh clone — your changes are on `claude/amazing-turing-8hAH3`
4. Say: _"Read HANDOVER.md and continue development on branch `claude/amazing-turing-8hAH3`"_
5. Claude Code will have access to all files, can run commands, edit code, and push changes
