import json
from typing import Any

from fastapi import APIRouter, HTTPException, Request, UploadFile, status
from pydantic import BaseModel

from app.core.deps import CurrentUserID, DBSession
from app.modules.audit.service import AuditService
from app.modules.knowledge.schemas import KnowledgeAssetCreate, KnowledgeAssetList, KnowledgeAssetRead, KnowledgeAssetUpdate
from app.modules.knowledge.service import KnowledgeService
from app.modules.orchestration.service import AIOrchestrationService

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.post("", response_model=KnowledgeAssetRead, status_code=status.HTTP_201_CREATED)
async def create_asset(data: KnowledgeAssetCreate, current_user_id: CurrentUserID, db: DBSession, request: Request) -> KnowledgeAssetRead:
    service = KnowledgeService(db)
    try:
        asset = await service.create_asset(data, current_user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    try:
        await AuditService(db).log(
            user_id=current_user_id,
            action="knowledge.create",
            resource_type="knowledge_asset",
            resource_id=str(asset.id),
            ip_address=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return asset


@router.post("/{asset_id}/upload", response_model=KnowledgeAssetRead)
async def upload_file(asset_id: str, file: UploadFile, current_user_id: CurrentUserID, db: DBSession) -> KnowledgeAssetRead:
    service = KnowledgeService(db)
    try:
        file_bytes = await file.read()
        asset = await service.upload_file(asset_id, file_bytes, file.filename or "upload")
        # Kick off async extraction + AI analysis on the worker
        try:
            from app.workers.tasks import process_knowledge_asset
            process_knowledge_asset.delay(str(asset_id))
        except Exception as exc:
            # Worker/broker unavailable — log it; the asset is uploaded and can
            # be re-indexed later, but we must not swallow this silently.
            import structlog
            structlog.get_logger(__name__).error(
                "knowledge_worker_dispatch_failed", asset_id=str(asset_id), error=str(exc)
            )
        return asset
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.get("", response_model=KnowledgeAssetList)
async def list_assets(db: DBSession, current_user_id: CurrentUserID, skip: int = 0, limit: int = 20) -> KnowledgeAssetList:
    service = KnowledgeService(db)
    return await service.list_assets(skip=skip, limit=limit)


@router.get("/{asset_id}", response_model=KnowledgeAssetRead)
async def get_asset(asset_id: str, db: DBSession, current_user_id: CurrentUserID) -> KnowledgeAssetRead:
    service = KnowledgeService(db)
    try:
        return await service.get_asset(asset_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{asset_id}", response_model=KnowledgeAssetRead)
async def update_asset(asset_id: str, data: KnowledgeAssetUpdate, db: DBSession, current_user_id: CurrentUserID) -> KnowledgeAssetRead:
    service = KnowledgeService(db)
    try:
        return await service.update_asset(asset_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


class ConceptGraph(BaseModel):
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]


@router.get("/{asset_id}/graph", response_model=ConceptGraph)
async def get_graph(asset_id: str, db: DBSession, current_user_id: CurrentUserID) -> ConceptGraph:
    service = KnowledgeService(db)
    try:
        asset = await service.get_asset(asset_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if not asset.content_graph:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Graph not generated yet")
    return asset.content_graph  # type: ignore[return-value]


@router.post("/{asset_id}/graph", response_model=ConceptGraph)
async def generate_graph(asset_id: str, db: DBSession, current_user_id: CurrentUserID) -> ConceptGraph:
    service = KnowledgeService(db)
    try:
        asset = await service.get_asset(asset_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    # Gather source material
    topics = asset.extracted_topics or []
    concepts = asset.extracted_concepts or []
    outcomes = asset.extracted_outcomes or []
    keywords = asset.keywords or []

    prompt = f"""You are an expert knowledge graph builder.
Given the following extracted knowledge elements from a document, identify meaningful relationships between them and return ONLY a valid JSON object (no markdown, no explanation).

Topics: {json.dumps(topics)}
Concepts: {json.dumps(concepts)}
Outcomes: {json.dumps(outcomes)}
Keywords: {json.dumps(keywords)}

Return a JSON object with this exact shape:
{{
  "nodes": [
    {{"id": "<short_unique_id>", "label": "<concept name>", "type": "topic|concept|outcome|keyword", "weight": <1-5>}}
  ],
  "edges": [
    {{"source": "<node_id>", "target": "<node_id>", "label": "relates_to|prerequisite|supports|contradicts", "weight": <0.1-1.0>}}
  ]
}}

Rules:
- Include 5–30 nodes drawn from topics, concepts, outcomes, and keywords.
- Add edges only where a genuine relationship exists.
- Node id must be a short alphanumeric slug (no spaces).
- Return ONLY the JSON object, nothing else."""

    ai = AIOrchestrationService()
    raw = await ai.complete([{"role": "user", "content": prompt}])

    # Strip possible markdown fences
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    try:
        graph = json.loads(text)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI returned invalid JSON: {exc}",
        )

    # Persist into DB
    from sqlalchemy import text as sql_text
    await db.execute(
        sql_text(
            "UPDATE knowledge_assets SET content_graph = :graph WHERE id = :id"
        ),
        {"graph": json.dumps(graph), "id": str(asset_id)},
    )
    await db.commit()

    return graph  # type: ignore[return-value]


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(asset_id: str, db: DBSession, current_user_id: CurrentUserID, request: Request) -> None:
    service = KnowledgeService(db)
    try:
        await service.delete_asset(asset_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    try:
        await AuditService(db).log(
            user_id=current_user_id,
            action="knowledge.delete",
            resource_type="knowledge_asset",
            resource_id=asset_id,
            ip_address=request.client.host if request.client else None,
        )
    except Exception:
        pass
