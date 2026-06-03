"""Assessment Intelligence Platform – FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    yield


app = FastAPI(
    title="Assessment Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.modules.auth.router import router as auth_router
from app.modules.knowledge.router import router as knowledge_router
from app.modules.frameworks.router import router as frameworks_router
from app.modules.assessment_config.router import router as assessment_config_router
from app.modules.generation.router import router as generation_router
from app.modules.orchestration.router import router as orchestration_router
from app.modules.quality.router import router as quality_router
from app.modules.repository.router import router as repository_router
from app.modules.workflow.router import router as workflow_router
from app.modules.assembly.router import router as assembly_router
from app.modules.dashboard.router import router as dashboard_router

API_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(knowledge_router, prefix=API_PREFIX)
app.include_router(frameworks_router, prefix=API_PREFIX)
app.include_router(assessment_config_router, prefix=API_PREFIX)
app.include_router(generation_router, prefix=API_PREFIX)
app.include_router(orchestration_router, prefix=API_PREFIX)
app.include_router(quality_router, prefix=API_PREFIX)
app.include_router(repository_router, prefix=API_PREFIX)
app.include_router(workflow_router, prefix=API_PREFIX)
app.include_router(assembly_router, prefix=API_PREFIX)
app.include_router(dashboard_router, prefix=API_PREFIX)


@app.get("/health", tags=["health"])
async def health_check() -> dict:
    return {"status": "ok", "version": "1.0.0"}
