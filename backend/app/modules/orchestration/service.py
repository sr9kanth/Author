"""LiteLLM wrapper for multi-provider AI orchestration."""

import asyncio
import os
import threading
import time
from typing import Any

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
            try:
                response = await litellm.acompletion(model=model_string, messages=messages, **kwargs)
                return response.choices[0].message.content or ""
            except Exception as exc:
                logger.warning("ai_fallback_attempt_failed", model=model_string, error=str(exc))
                last_exc = exc
        raise RuntimeError(f"All model fallbacks exhausted. Last error: {last_exc}")

    async def get_available_models(self) -> list[dict]:
        # Check which provider keys are configured (env var takes precedence over settings
        # so that runtime updates via the settings API are reflected immediately).
        def _key_set(env_var: str, settings_val: str) -> bool:
            return bool(os.environ.get(env_var) or settings_val)

        provider_key_configured: dict[str, bool] = {
            "anthropic": _key_set("ANTHROPIC_API_KEY", settings.ANTHROPIC_API_KEY),
            "openai": _key_set("OPENAI_API_KEY", settings.OPENAI_API_KEY),
            "gemini": _key_set("GEMINI_API_KEY", settings.GEMINI_API_KEY),
            "deepseek": _key_set("DEEPSEEK_API_KEY", settings.DEEPSEEK_API_KEY),
            # Ollama needs no key, but it's only usable if a local server is
            # actually running and reachable. Gate it behind OLLAMA_ENABLED so
            # it isn't presented as an available fallback (and silently
            # auto-selected) when no Ollama is up — which fails with
            # "Cannot connect to host localhost:11434".
            "ollama": settings.OLLAMA_ENABLED,
        }

        raw_models = [
            {"id": "claude-opus-4-8", "provider": "anthropic", "context_window": 200000},
            {"id": "claude-sonnet-4-5", "provider": "anthropic", "context_window": 200000},
            {"id": "gpt-4o", "provider": "openai", "context_window": 128000},
            {"id": "gpt-4o-mini", "provider": "openai", "context_window": 128000},
            {"id": "gemini-1.5-pro", "provider": "gemini", "context_window": 1000000},
            {"id": "gemini-1.5-flash", "provider": "gemini", "context_window": 1000000},
            {"id": "deepseek-chat", "provider": "deepseek", "context_window": 128000},
            {"id": "deepseek-reasoner", "provider": "deepseek", "context_window": 128000},
            {"id": "llama3.2", "provider": "ollama", "context_window": 128000},
        ]

        models = [
            {**m, "key_configured": provider_key_configured.get(m["provider"], False)}
            for m in raw_models
        ]
        return models
