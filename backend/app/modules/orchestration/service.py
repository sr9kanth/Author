"""LiteLLM wrapper for multi-provider AI orchestration."""

import time
from typing import Any

import litellm
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


class AIOrchestrationService:
    """Routes AI requests through LiteLLM to Claude, OpenAI, Gemini, or Ollama."""

    def __init__(self) -> None:
        # Configure provider keys
        if settings.ANTHROPIC_API_KEY:
            litellm.anthropic_key = settings.ANTHROPIC_API_KEY
        if settings.OPENAI_API_KEY:
            litellm.openai_key = settings.OPENAI_API_KEY
        if settings.GEMINI_API_KEY:
            litellm.gemini_key = settings.GEMINI_API_KEY

    def _build_model_string(self, model: str | None, provider: str | None) -> str:
        effective_model = model or settings.LITELLM_DEFAULT_MODEL
        effective_provider = provider or settings.LITELLM_DEFAULT_PROVIDER

        provider_prefixes = {
            "anthropic": "anthropic/",
            "openai": "",
            "gemini": "gemini/",
            "ollama": "ollama/",
        }
        prefix = provider_prefixes.get(effective_provider, "")
        if prefix and not effective_model.startswith(prefix):
            return f"{prefix}{effective_model}"
        return effective_model

    async def complete(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        provider: str | None = None,
        **kwargs: Any,
    ) -> str:
        model_string = self._build_model_string(model, provider)
        start_ms = int(time.time() * 1000)
        try:
            response = await litellm.acompletion(
                model=model_string,
                messages=messages,
                **kwargs,
            )
            elapsed_ms = int(time.time() * 1000) - start_ms
            content = response.choices[0].message.content or ""
            usage = response.usage or {}
            logger.info(
                "ai_completion",
                model=model_string,
                prompt_tokens=getattr(usage, "prompt_tokens", 0),
                completion_tokens=getattr(usage, "completion_tokens", 0),
                latency_ms=elapsed_ms,
            )
            return content
        except Exception as exc:
            logger.error("ai_completion_failed", model=model_string, error=str(exc))
            raise

    async def complete_with_fallback(
        self,
        messages: list[dict[str, str]],
        models: list[str],
        **kwargs: Any,
    ) -> str:
        last_exc: Exception | None = None
        for model_string in models:
            try:
                response = await litellm.acompletion(model=model_string, messages=messages, **kwargs)
                return response.choices[0].message.content or ""
            except Exception as exc:
                logger.warning("ai_fallback_attempt_failed", model=model_string, error=str(exc))
                last_exc = exc
        raise RuntimeError(f"All model fallbacks exhausted. Last error: {last_exc}")

    async def get_available_models(self) -> list[dict]:
        models = [
            {"id": "claude-opus-4-8", "provider": "anthropic", "context_window": 200000},
            {"id": "claude-sonnet-4-5", "provider": "anthropic", "context_window": 200000},
            {"id": "gpt-4o", "provider": "openai", "context_window": 128000},
            {"id": "gpt-4o-mini", "provider": "openai", "context_window": 128000},
            {"id": "gemini-1.5-pro", "provider": "gemini", "context_window": 1000000},
            {"id": "gemini-1.5-flash", "provider": "gemini", "context_window": 1000000},
            {"id": "llama3.2", "provider": "ollama", "context_window": 128000},
        ]
        return models

    async def estimate_cost(self, messages: list[dict], model: str) -> float:
        try:
            token_count = litellm.token_counter(model=model, messages=messages)
            cost = litellm.completion_cost(
                completion_response=None,
                model=model,
                prompt="",
                completion="",
                prompt_tokens=token_count,
                completion_tokens=int(token_count * 0.5),
            )
            return float(cost or 0.0)
        except Exception:
            return 0.0
