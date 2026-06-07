"""RAG retrieval over DocumentChunk, with vector + keyword fallback paths."""

import uuid

import structlog
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.knowledge.chunk_models import DocumentChunk
from app.modules.knowledge.embeddings import embed_query

logger = structlog.get_logger(__name__)


def _as_uuids(asset_ids: list[str] | None) -> list[uuid.UUID]:
    out: list[uuid.UUID] = []
    for a in asset_ids or []:
        try:
            out.append(a if isinstance(a, uuid.UUID) else uuid.UUID(str(a)))
        except (ValueError, TypeError):
            continue
    return out


async def retrieve_chunks(
    db: AsyncSession,
    query: str,
    asset_ids: list[str] | None,
    k: int = 8,
) -> list[str]:
    """Retrieve up to ``k`` chunk contents most relevant to ``query``.

    Uses pgvector cosine distance when embeddings are available, otherwise a
    keyword ILIKE search, falling back to the first ``k`` chunks for the assets.
    Never raises — returns [] on failure so callers can degrade gracefully.
    """
    asset_uuids = _as_uuids(asset_ids)

    # --- 1. Vector path ---
    try:
        qvec = await embed_query(query)
    except Exception:
        qvec = None

    if qvec is not None:
        try:
            stmt = select(DocumentChunk.content).where(DocumentChunk.embedding.isnot(None))
            if asset_uuids:
                stmt = stmt.where(DocumentChunk.asset_id.in_(asset_uuids))
            stmt = stmt.order_by(DocumentChunk.embedding.cosine_distance(qvec)).limit(k)
            rows = (await db.execute(stmt)).scalars().all()
            if rows:
                return list(rows)
        except Exception as exc:
            logger.warning("vector_retrieval_failed", error=str(exc))

    # --- 2. Keyword fallback ---
    try:
        words = [w for w in (query or "").split() if len(w) > 2][:12]
        if words:
            kw_stmt = select(DocumentChunk.content)
            if asset_uuids:
                kw_stmt = kw_stmt.where(DocumentChunk.asset_id.in_(asset_uuids))
            kw_stmt = kw_stmt.where(
                or_(*[DocumentChunk.content.ilike(f"%{w}%") for w in words])
            ).limit(k)
            rows = (await db.execute(kw_stmt)).scalars().all()
            if rows:
                return list(rows)
    except Exception as exc:
        logger.warning("keyword_retrieval_failed", error=str(exc))

    # --- 3. Last-resort: first k chunks for the assets ---
    try:
        fb_stmt = select(DocumentChunk.content)
        if asset_uuids:
            fb_stmt = fb_stmt.where(DocumentChunk.asset_id.in_(asset_uuids))
        fb_stmt = fb_stmt.order_by(DocumentChunk.asset_id, DocumentChunk.chunk_index).limit(k)
        rows = (await db.execute(fb_stmt)).scalars().all()
        return list(rows)
    except Exception as exc:
        logger.warning("fallback_retrieval_failed", error=str(exc))
        return []
