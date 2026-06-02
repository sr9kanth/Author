"""
AIP Demo Server — runs without Postgres, Redis, or AI provider keys.
All data is in-memory. Demonstrates all API surface areas.
"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Assessment Intelligence Platform (AIP)",
    description="AI-native platform for creating, managing, and assembling assessment content.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory stores ──────────────────────────────────────────────────────────
USERS: dict[str, dict] = {
    "1": {"id": "1", "email": "admin@aip.io", "full_name": "Alice Admin", "role": "administrator"},
    "2": {"id": "2", "email": "author@aip.io", "full_name": "Bob Author", "role": "author"},
    "3": {"id": "3", "email": "reviewer@aip.io", "full_name": "Carol Reviewer", "role": "reviewer"},
}

KNOWLEDGE_ASSETS: dict[str, dict] = {
    "ka-1": {
        "id": "ka-1",
        "title": "Workplace Health & Safety Act 2024",
        "content_type": "pdf",
        "status": "processed",
        "extracted_topics": ["hazard identification", "risk assessment", "incident reporting"],
        "extracted_concepts": ["duty of care", "PCBU obligations", "safe work method statements"],
        "keywords": ["safety", "hazard", "risk", "incident", "WHS"],
        "created_at": "2024-11-01T09:00:00Z",
    },
    "ka-2": {
        "id": "ka-2",
        "title": "Data Privacy Regulations Handbook",
        "content_type": "docx",
        "status": "processed",
        "extracted_topics": ["data collection", "consent", "breach notification", "subject rights"],
        "extracted_concepts": ["GDPR", "data minimisation", "right to erasure", "data controller"],
        "keywords": ["privacy", "GDPR", "data", "consent", "breach"],
        "created_at": "2024-11-05T10:00:00Z",
    },
}

FRAMEWORKS: dict[str, dict] = {
    "fw-1": {
        "id": "fw-1",
        "name": "Workplace Safety Competency Framework",
        "version": "2.1",
        "domains": [
            {
                "id": "d-1",
                "name": "Hazard Management",
                "competencies": [
                    {"id": "c-1", "name": "Hazard Identification", "skills": ["Identify physical hazards", "Assess chemical risks"]},
                    {"id": "c-2", "name": "Risk Control", "skills": ["Apply hierarchy of controls", "Implement corrective actions"]},
                ],
            }
        ],
        "status": "active",
        "created_at": "2024-10-01T08:00:00Z",
    }
}

CONFIGURATIONS: dict[str, dict] = {
    "cfg-1": {
        "id": "cfg-1",
        "name": "WHS Certification Assessment",
        "question_types": ["multiple_choice", "true_false", "scenario_based"],
        "difficulty_levels": {"easy": 5, "medium": 10, "hard": 5},
        "cognitive_levels": ["remember", "understand", "apply"],
        "question_count": 20,
        "language": "en-AU",
        "audience": "frontline_workers",
        "duration_minutes": 45,
        "framework_id": "fw-1",
    }
}

GENERATION_JOBS: dict[str, dict] = {
    "job-1": {
        "id": "job-1",
        "status": "completed",
        "configuration_id": "cfg-1",
        "knowledge_asset_ids": ["ka-1"],
        "ai_provider": "deepseek",
        "ai_model": "deepseek-chat",
        "prompt_version": "v1.2",
        "created_at": "2024-11-10T14:00:00Z",
        "completed_at": "2024-11-10T14:00:47Z",
    }
}

CONTENT_ITEMS: dict[str, dict] = {
    "ci-1": {
        "id": "ci-1",
        "job_id": "job-1",
        "question_type": "multiple_choice",
        "difficulty": "medium",
        "cognitive_level": "apply",
        "body": "A worker notices a frayed electrical cord on a power tool. According to the hierarchy of controls, what is the MOST preferred initial action?",
        "options": [
            "A. Place a warning sign near the tool",
            "B. Remove the tool from service and tag it out",
            "C. Wear insulated gloves when using the tool",
            "D. Inform the supervisor at the next team meeting",
        ],
        "correct_answer": "B",
        "rationale": "Elimination and substitution sit at the top of the hierarchy of controls. Removing the defective tool from service eliminates the hazard immediately.",
        "framework_alignment": {"competency": "Hazard Identification", "skill": "Identify physical hazards"},
        "source_references": ["ka-1"],
        "ai_provider": "deepseek",
        "ai_model": "deepseek-chat",
        "validation_score": 0.94,
        "status": "approved",
    },
    "ci-2": {
        "id": "ci-2",
        "job_id": "job-1",
        "question_type": "true_false",
        "difficulty": "easy",
        "cognitive_level": "remember",
        "body": "Under WHS legislation, a Person Conducting a Business or Undertaking (PCBU) has a duty to ensure the health and safety of workers so far as is reasonably practicable.",
        "correct_answer": "True",
        "rationale": "Section 19 of the Model WHS Act imposes a primary duty of care on the PCBU.",
        "framework_alignment": {"competency": "Risk Control", "skill": "Apply hierarchy of controls"},
        "source_references": ["ka-1"],
        "ai_provider": "deepseek",
        "ai_model": "deepseek-chat",
        "validation_score": 0.98,
        "status": "under_review",
    },
}

ASSESSMENTS: dict[str, dict] = {
    "asmnt-1": {
        "id": "asmnt-1",
        "title": "WHS Certification — Module 1",
        "framework_id": "fw-1",
        "content_item_ids": ["ci-1", "ci-2"],
        "status": "published",
        "total_marks": 20,
        "passing_score": 70,
        "duration_minutes": 45,
        "created_at": "2024-11-11T09:00:00Z",
    }
}

AI_PROVIDERS = [
    {"provider": "deepseek", "models": ["deepseek-chat", "deepseek-reasoner"], "status": "available"},
    {"provider": "anthropic", "models": ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"], "status": "available"},
    {"provider": "openai", "models": ["gpt-4o", "gpt-4o-mini"], "status": "available"},
    {"provider": "google", "models": ["gemini-1.5-pro", "gemini-1.5-flash"], "status": "available"},
    {"provider": "ollama", "models": ["llama3.2", "mistral", "qwen2.5"], "status": "local"},
]


# ── Schemas ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class GenerateRequest(BaseModel):
    configuration_id: str
    knowledge_asset_ids: list[str]
    ai_provider: str = "deepseek"
    ai_model: str = "deepseek-chat"

class ReviewAction(BaseModel):
    action: str  # approve | reject | request_changes
    comment: str = ""


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "version": "1.0.0", "environment": "demo"}


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/api/v1/auth/login", tags=["Auth"])
def login(body: LoginRequest):
    user = next((u for u in USERS.values() if u["email"] == body.email), None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "access_token": f"demo-token-{user['id']}",
        "token_type": "bearer",
        "user": user,
    }

@app.get("/api/v1/auth/me", tags=["Auth"])
def me():
    return USERS["1"]

@app.get("/api/v1/users", tags=["Auth"])
def list_users():
    return list(USERS.values())


# ── Knowledge Repository ──────────────────────────────────────────────────────

@app.get("/api/v1/knowledge", tags=["Knowledge Repository"])
def list_knowledge_assets():
    return {"items": list(KNOWLEDGE_ASSETS.values()), "total": len(KNOWLEDGE_ASSETS)}

@app.get("/api/v1/knowledge/{asset_id}", tags=["Knowledge Repository"])
def get_knowledge_asset(asset_id: str):
    asset = KNOWLEDGE_ASSETS.get(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@app.post("/api/v1/knowledge", tags=["Knowledge Repository"])
def create_knowledge_asset(title: str, content_type: str = "pdf"):
    new_id = f"ka-{len(KNOWLEDGE_ASSETS) + 1}"
    asset = {
        "id": new_id, "title": title, "content_type": content_type,
        "status": "uploaded", "extracted_topics": [], "extracted_concepts": [],
        "keywords": [], "created_at": datetime.utcnow().isoformat() + "Z",
    }
    KNOWLEDGE_ASSETS[new_id] = asset
    return asset


# ── Learning Frameworks ───────────────────────────────────────────────────────

@app.get("/api/v1/frameworks", tags=["Learning Frameworks"])
def list_frameworks():
    return {"items": list(FRAMEWORKS.values()), "total": len(FRAMEWORKS)}

@app.get("/api/v1/frameworks/{framework_id}", tags=["Learning Frameworks"])
def get_framework(framework_id: str):
    fw = FRAMEWORKS.get(framework_id)
    if not fw:
        raise HTTPException(status_code=404, detail="Framework not found")
    return fw


# ── Assessment Configuration ──────────────────────────────────────────────────

@app.get("/api/v1/configurations", tags=["Assessment Configuration"])
def list_configurations():
    return {"items": list(CONFIGURATIONS.values()), "total": len(CONFIGURATIONS)}

@app.get("/api/v1/configurations/{config_id}", tags=["Assessment Configuration"])
def get_configuration(config_id: str):
    cfg = CONFIGURATIONS.get(config_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="Configuration not found")
    return cfg


# ── AI Orchestration ──────────────────────────────────────────────────────────

@app.get("/api/v1/orchestration/providers", tags=["AI Orchestration"])
def list_providers():
    return {"providers": AI_PROVIDERS}

@app.get("/api/v1/orchestration/models/{provider}", tags=["AI Orchestration"])
def list_models(provider: str):
    p = next((p for p in AI_PROVIDERS if p["provider"] == provider), None)
    if not p:
        raise HTTPException(status_code=404, detail="Provider not found")
    return p


# ── Content Generation ────────────────────────────────────────────────────────

@app.get("/api/v1/generation/jobs", tags=["Content Generation"])
def list_jobs():
    return {"items": list(GENERATION_JOBS.values()), "total": len(GENERATION_JOBS)}

@app.post("/api/v1/generation/jobs", tags=["Content Generation"])
def create_generation_job(body: GenerateRequest):
    if body.configuration_id not in CONFIGURATIONS:
        raise HTTPException(status_code=404, detail="Configuration not found")
    new_id = f"job-{len(GENERATION_JOBS) + 1}"
    job = {
        "id": new_id,
        "status": "pending",
        "configuration_id": body.configuration_id,
        "knowledge_asset_ids": body.knowledge_asset_ids,
        "ai_provider": body.ai_provider,
        "ai_model": body.ai_model,
        "prompt_version": "v1.2",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "completed_at": None,
    }
    GENERATION_JOBS[new_id] = job
    return {"job": job, "message": "Generation job queued. In production this runs via Celery worker."}

@app.get("/api/v1/generation/jobs/{job_id}", tags=["Content Generation"])
def get_job(job_id: str):
    job = GENERATION_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# ── Content Repository ────────────────────────────────────────────────────────

@app.get("/api/v1/repository", tags=["Content Repository"])
def list_content(status: str | None = None):
    items = list(CONTENT_ITEMS.values())
    if status:
        items = [i for i in items if i["status"] == status]
    return {"items": items, "total": len(items)}

@app.get("/api/v1/repository/{content_id}", tags=["Content Repository"])
def get_content(content_id: str):
    item = CONTENT_ITEMS.get(content_id)
    if not item:
        raise HTTPException(status_code=404, detail="Content not found")
    return item


# ── Quality Assurance ─────────────────────────────────────────────────────────

@app.post("/api/v1/quality/validate/{content_id}", tags=["Quality Assurance"])
def validate_content(content_id: str):
    if content_id not in CONTENT_ITEMS:
        raise HTTPException(status_code=404, detail="Content not found")
    return {
        "content_id": content_id,
        "overall_score": 0.94,
        "passed": True,
        "validators": {
            "grammar": {"score": 1.0, "passed": True, "issues": []},
            "duplicate_detection": {"score": 1.0, "passed": True, "issues": []},
            "ambiguity": {"score": 0.92, "passed": True, "issues": ["Minor: 'most preferred' could be clarified"]},
            "bias": {"score": 0.98, "passed": True, "issues": []},
            "accessibility": {"score": 0.95, "passed": True, "issues": []},
            "answer_validation": {"score": 1.0, "passed": True, "issues": []},
            "framework_alignment": {"score": 0.96, "passed": True, "issues": []},
            "difficulty_prediction": {"score": 0.88, "passed": True, "predicted_difficulty": "medium"},
            "reading_level": {"score": 0.91, "passed": True, "reading_level": "Grade 10"},
            "hallucination_detection": {"score": 0.97, "passed": True, "issues": []},
        },
    }


# ── Review Workflow ───────────────────────────────────────────────────────────

@app.get("/api/v1/workflow/pending", tags=["Review Workflow"])
def list_pending_reviews():
    pending = [i for i in CONTENT_ITEMS.values() if i["status"] == "under_review"]
    return {"items": pending, "total": len(pending)}

@app.post("/api/v1/workflow/{content_id}/review", tags=["Review Workflow"])
def submit_review(content_id: str, body: ReviewAction):
    item = CONTENT_ITEMS.get(content_id)
    if not item:
        raise HTTPException(status_code=404, detail="Content not found")
    status_map = {"approve": "approved", "reject": "draft", "request_changes": "under_review"}
    if body.action not in status_map:
        raise HTTPException(status_code=400, detail="Invalid action")
    CONTENT_ITEMS[content_id]["status"] = status_map[body.action]
    return {
        "content_id": content_id,
        "action": body.action,
        "new_status": status_map[body.action],
        "comment": body.comment,
        "reviewed_at": datetime.utcnow().isoformat() + "Z",
    }


# ── Assessment Assembly ───────────────────────────────────────────────────────

@app.get("/api/v1/assembly", tags=["Assessment Assembly"])
def list_assessments():
    return {"items": list(ASSESSMENTS.values()), "total": len(ASSESSMENTS)}

@app.get("/api/v1/assembly/{assessment_id}", tags=["Assessment Assembly"])
def get_assessment(assessment_id: str):
    a = ASSESSMENTS.get(assessment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {**a, "content_items": [CONTENT_ITEMS[i] for i in a["content_item_ids"] if i in CONTENT_ITEMS]}


# ── Reporting ─────────────────────────────────────────────────────────────────

@app.get("/api/v1/reporting/metrics", tags=["Reporting"])
def get_metrics():
    items = list(CONTENT_ITEMS.values())
    return {
        "content": {
            "total_generated": len(items),
            "approved": sum(1 for i in items if i["status"] == "approved"),
            "under_review": sum(1 for i in items if i["status"] == "under_review"),
            "rejected": 0,
        },
        "knowledge_assets": len(KNOWLEDGE_ASSETS),
        "frameworks": len(FRAMEWORKS),
        "assessments": len(ASSESSMENTS),
        "ai_usage": {
            "total_jobs": len(GENERATION_JOBS),
            "anthropic_jobs": 1,
            "avg_validation_score": 0.96,
            "avg_generation_time_seconds": 47,
        },
    }
