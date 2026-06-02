# Deployment Guide

## Architecture

| Service | Platform | Notes |
|---|---|---|
| Frontend (Next.js) | Vercel | Auto-deploys from main branch |
| Backend (FastAPI) | Railway | Docker-based |
| Celery Worker | Railway | Same image, different start command |
| PostgreSQL + pgvector | Railway | Managed plugin |
| Redis | Railway | Managed plugin |
| File Storage | AWS S3 / Cloudflare R2 | Bring your own |

## Prerequisites

- [Railway account](https://railway.app)
- [Vercel account](https://vercel.com)
- GitHub repo connected to both

---

## 1. Deploy Backend to Railway

### Create a new Railway project

1. Go to [railway.app](https://railway.app) → New Project
2. Select **Deploy from GitHub repo** → select this repo
3. Railway will detect the `railway.toml` and use `backend/Dockerfile`

### Add plugins

In your Railway project dashboard:
- Click **+ New** → **Database** → **PostgreSQL** (this gives you pgvector support via `pgvector/pgvector:pg16`)
- Click **+ New** → **Database** → **Redis**

### Set environment variables

In your Railway backend service → **Variables**, add:

```
SECRET_KEY=<run: openssl rand -hex 32>
ANTHROPIC_API_KEY=<your key>
OPENAI_API_KEY=<your key>
GEMINI_API_KEY=<your key>
AWS_ACCESS_KEY_ID=<your key>
AWS_SECRET_ACCESS_KEY=<your key>
AWS_BUCKET_NAME=aip-assets
AWS_ENDPOINT_URL=<leave blank for AWS, set for R2/MinIO>
ENVIRONMENT=production
CORS_ORIGINS=["https://your-app.vercel.app"]
```

Railway auto-injects `DATABASE_URL` and `REDIS_URL` from the plugins.

### Add Celery worker service

1. In your Railway project → **+ New** → **GitHub Repo** (same repo)
2. Override the start command to:
   ```
   celery -A app.workers.celery_app worker --loglevel=info
   ```
3. Copy all the same environment variables from the backend service

### Run database migrations

In Railway → your backend service → **Deploy** tab → open a shell:
```bash
alembic upgrade head
```

---

## 2. Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set **Root Directory** to `frontend`
3. Vercel auto-detects Next.js

### Set environment variables in Vercel

```
NEXT_PUBLIC_API_URL=https://<your-railway-backend-url>.up.railway.app
```

Find your Railway backend URL in: Railway dashboard → your backend service → **Settings** → **Networking** → **Public URL**.

---

## 3. CI/CD

The `.github/workflows/deploy.yml` workflow:
- Runs backend tests (pytest) and frontend type-check on every PR and push to `main`
- Vercel deploys automatically on merge to `main` via its GitHub integration
- Railway deploys automatically on merge to `main` via its GitHub integration

---

## 4. pgvector setup

Railway's default Postgres image does not include pgvector. Either:

**Option A** — Use Railway's custom image:
In Railway Postgres service → Settings → change the image to `pgvector/pgvector:pg16`

**Option B** — Use Supabase (includes pgvector by default):
Replace `DATABASE_URL` with your Supabase connection string.

After connecting, enable the extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Auto | Injected by Railway Postgres plugin |
| `REDIS_URL` | Auto | Injected by Railway Redis plugin |
| `SECRET_KEY` | Yes | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Optional | For Claude models |
| `OPENAI_API_KEY` | Optional | For GPT models |
| `GEMINI_API_KEY` | Optional | For Gemini models |
| `OLLAMA_BASE_URL` | Optional | Self-hosted only |
| `AWS_ACCESS_KEY_ID` | Optional | For file uploads |
| `AWS_SECRET_ACCESS_KEY` | Optional | For file uploads |
| `AWS_BUCKET_NAME` | Optional | Default: `aip-assets` |
| `CORS_ORIGINS` | Yes | `["https://your-app.vercel.app"]` |
| `ENVIRONMENT` | Yes | `production` |

### Frontend (Vercel)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Your Railway backend public URL |
