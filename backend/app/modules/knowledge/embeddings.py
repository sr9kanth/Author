"""Embedding generation via LiteLLM, with graceful no-key degradation."""

import os

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


def _export_provider_keys() -> None:
    """Mirror configured keys into env so LiteLLM can authenticate (see orchestration)."""
    if settings.OPENAI_API_KEY:
        os.environ.setdefault("OPENAI_API_KEY", settings.OPENAI_API_KEY)
    if settings.GEMINI_API_KEY:
        os.environ.setdefault("GEMINI_API_KEY", settings.GEMINI_API_KEY)
    if settings.ANTHROPIC_API_KEY:
        os.environ.setdefault("ANTHROPIC_API_KEY", settings.ANTHROPIC_API_KEY)


async def embed_texts(texts: list[str]) -> list[list[float]] | None:
    """Embed a batch of texts.

    Returns a list of vectors aligned with ``texts``, or ``None`` when
    embeddings are disabled (no key) or any error occurs. Callers must treat
    ``None`` as "fall back to keyword search".
    """
    if not settings.embeddings_enabled:
        return None
    if not texts:
        return []

    _export_provider_keys()
    try:
        import litellm

        response = await litellm.aembedding(
            model=settings.EMBEDDING_MODEL,
            input=texts,
            timeout=settings.AI_REQUEST_TIMEOUT,
        )
        # LiteLLM returns objects/dicts with an "embedding" field per item.
        vectors: list[list[float]] = []
        for item in response.data:
            vec = item["embedding"] if isinstance(item, dict) else item.embedding
            vectors.append(list(vec))
        return vectors
    except Exception as exc:
        logger.warning("embed_texts_failed", error=str(exc), count=len(texts))
        return None


async def embed_query(text: str) -> list[float] | None:
    """Embed a single query string, or ``None`` if unavailable."""
    if not text or not text.strip():
        return None
    vectors = await embed_texts([text])
    if not vectors:
        return None
    return vectors[0]
