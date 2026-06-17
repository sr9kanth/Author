"""LiteLLM wrapper for multi-provider AI orchestration."""

import asyncio
import os
import threading
import time
from typing import Any

import httpx
import litellm
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAYS = [2, 4, 8]  # exponential backoff in seconds

# Circuit-breaker: provider -> consecutive failure count
_provider_failures: dict[str, int] = {}
_circuit_lock = threading.Lock()
_CIRCUIT_OPEN_THRESHOLD = 5


class AIOrchestrationService:
    """Routes AI requests through LiteLLM to Claude, OpenAI, Gemini, or Ollama."""

    def __init__(self) -> None:
        # LiteLLM reads provider keys from environment variables, not from
        # litellm.<provider>_key attributes (those are silent no-ops). Export
        # whatever is configured so the chosen provider can authenticate.
        if settings.ANTHROPIC_API_KEY:
            os.environ["ANTHROPIC_API_KEY"] = settings.ANTHROPIC_API_KEY
        if settings.OPENAI_API_KEY:
            os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY
        if settings.GEMINI_API_KEY:
            os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY
        if settings.DEEPSEEK_API_KEY:
            os.environ["DEEPSEEK_API_KEY"] = settings.DEEPSEEK_API_KEY

    def _build_model_string(self, model: str | None, provider: str | None) -> str:
        effective_model = model or settings.LITELLM_DEFAULT_MODEL
        effective_provider = provider or settings.LITELLM_DEFAULT_PROVIDER

        provider_prefixes = {
            "anthropic": "anthropic/",
            "openai": "",
            "gemini": "gemini/",
            "ollama": "ollama/",
            "deepseek": "deepseek/",
        }
        prefix = provider_prefixes.get(effective_provider, "")
        if prefix and not effective_model.startswith(prefix):
            return f"{prefix}{effective_model}"
        return effective_model

    def _ollama_kwargs(self, provider: str | None, model: str | None) -> dict:
        """Return api_base kwarg when routing to Ollama so LiteLLM uses the configured host."""
        effective_provider = provider or settings.LITELLM_DEFAULT_PROVIDER
        effective_model = model or settings.LITELLM_DEFAULT_MODEL
        if effective_provider == "ollama" or effective_model.startswith("ollama/"):
            return {"api_base": settings.OLLAMA_BASE_URL}
        return {}

    async def complete(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        provider: str | None = None,
        **kwargs: Any,
    ) -> str:
        """Return just the completion text (convenience wrapper)."""
        result = await self.complete_detailed(messages, model, provider, **kwargs)
        return result["content"]

    async def complete_detailed(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        provider: str | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Run a completion and return content plus usage/cost/latency metadata.

        Includes retry logic with exponential backoff and a simple in-memory
        circuit-breaker per provider.
        """
        model_string = self._build_model_string(model, provider)
        effective_provider = provider or settings.LITELLM_DEFAULT_PROVIDER
        kwargs.setdefault("timeout", settings.AI_REQUEST_TIMEOUT)
        kwargs.update(self._ollama_kwargs(provider, model))

        # Circuit-breaker check
        with _circuit_lock:
            failures = _provider_failures.get(effective_provider, 0)
        if failures >= _CIRCUIT_OPEN_THRESHOLD:
            raise RuntimeError(
                f"Circuit open for provider {effective_provider} — too many failures"
            )

        _retryable = (
            litellm.exceptions.RateLimitError,
            litellm.exceptions.ServiceUnavailableError,
            litellm.exceptions.Timeout,
            asyncio.TimeoutError,
        )

        last_exc: Exception | None = None
        for attempt in range(MAX_RETRIES + 1):
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
                prompt_tokens = int(getattr(usage, "prompt_tokens", 0) or 0)
                completion_tokens = int(getattr(usage, "completion_tokens", 0) or 0)

                cost_usd = 0.0
                try:
                    cost_usd = float(litellm.completion_cost(completion_response=response) or 0.0)
                except Exception:
                    cost_usd = 0.0

                # Reset circuit-breaker on success
                with _circuit_lock:
                    _provider_failures[effective_provider] = 0

                logger.info(
                    "ai_completion",
                    model=model_string,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    cost_usd=cost_usd,
                    latency_ms=elapsed_ms,
                )
                return {
                    "content": content,
                    "model": model_string,
                    "provider": effective_provider,
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "cost_usd": cost_usd,
                    "latency_ms": elapsed_ms,
                }

            except litellm.exceptions.AuthenticationError as exc:
                # Bad key — retrying will never help
                logger.error("ai_completion_auth_error", model=model_string, error=str(exc))
                with _circuit_lock:
                    _provider_failures[effective_provider] = (
                        _provider_failures.get(effective_provider, 0) + 1
                    )
                raise

            except Exception as exc:
                last_exc = exc
                with _circuit_lock:
                    _provider_failures[effective_provider] = (
                        _provider_failures.get(effective_provider, 0) + 1
                    )

                if attempt < MAX_RETRIES:
                    delay = RETRY_DELAYS[attempt]
                    logger.warning(
                        "ai_completion_retry",
                        attempt=attempt + 1,
                        model=model_string,
                        delay_s=delay,
                        error=str(exc),
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error("ai_completion_failed", model=model_string, error=str(exc))

        raise last_exc  # type: ignore[misc]

    async def complete_with_fallback(
        self,
        messages: list[dict[str, str]],
        models: list[str],
        **kwargs: Any,
    ) -> str:
        last_exc: Exception | None = None
        kwargs.setdefault("timeout", settings.AI_REQUEST_TIMEOUT)
        for model_string in models:
            provider = "ollama" if model_string.startswith("ollama/") else None
            extra = self._ollama_kwargs(provider, model_string)
            try:
                response = await litellm.acompletion(model=model_string, messages=messages, **extra, **kwargs)
                return response.choices[0].message.content or ""
            except Exception as exc:
                logger.warning("ai_fallback_attempt_failed", model=model_string, error=str(exc))
                last_exc = exc
        raise RuntimeError(f"All model fallbacks exhausted. Last error: {last_exc}")

    _CLOUD_MODELS: list[dict] = [
        {"id": "claude-opus-4-8", "provider": "anthropic", "context_window": 200000},
        {"id": "claude-sonnet-4-6", "provider": "anthropic", "context_window": 200000},
        {"id": "claude-haiku-4-5", "provider": "anthropic", "context_window": 200000},
        {"id": "gpt-4o", "provider": "openai", "context_window": 128000},
        {"id": "gpt-4o-mini", "provider": "openai", "context_window": 128000},
        {"id": "gemini-1.5-pro", "provider": "gemini", "context_window": 1000000},
        {"id": "gemini-1.5-flash", "provider": "gemini", "context_window": 1000000},
        {"id": "deepseek-chat", "provider": "deepseek", "context_window": 128000},
        {"id": "deepseek-reasoner", "provider": "deepseek", "context_window": 128000},
    ]

    async def _fetch_ollama_models(self) -> list[dict]:
        """Query Ollama /api/tags to discover locally pulled models."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                return [
                    {
                        "id": m["name"],
                        "provider": "ollama",
                        "context_window": 128000,
                        "local": True,
                        "size_gb": round(m.get("size", 0) / 1e9, 1),
                    }
                    for m in data.get("models", [])
                ]
        except Exception as exc:
            logger.info("ollama_unreachable", url=settings.OLLAMA_BASE_URL, error=str(exc))
            return []

    async def get_available_models(self) -> list[dict]:
        def _key_set(env_var: str, settings_val: str) -> bool:
            return bool(os.environ.get(env_var) or settings_val)

        provider_key_configured: dict[str, bool] = {
            "anthropic": _key_set("ANTHROPIC_API_KEY", settings.ANTHROPIC_API_KEY),
            "openai": _key_set("OPENAI_API_KEY", settings.OPENAI_API_KEY),
            "gemini": _key_set("GEMINI_API_KEY", settings.GEMINI_API_KEY),
            "deepseek": _key_set("DEEPSEEK_API_KEY", settings.DEEPSEEK_API_KEY),
            "ollama": True,  # Ollama needs no key; reachability shown via /ollama/status
        }

        cloud_with_keys = [
            {**m, "key_configured": provider_key_configured.get(m["provider"], False)}
            for m in self._CLOUD_MODELS
        ]
        local_models = await self._fetch_ollama_models()
        local_with_keys = [{**m, "key_configured": True} for m in local_models]
        return [*cloud_with_keys, *local_with_keys]

    async def get_ollama_status(self) -> dict:
        """Return Ollama reachability + pulled model list."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                models = [m["name"] for m in data.get("models", [])]
                return {"reachable": True, "base_url": settings.OLLAMA_BASE_URL, "models": models}
        except Exception as exc:
            return {"reachable": False, "base_url": settings.OLLAMA_BASE_URL, "models": [], "error": str(exc)}
