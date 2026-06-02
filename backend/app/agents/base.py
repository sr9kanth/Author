"""Base agent class for all AIP agents."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

import structlog

from app.modules.orchestration.service import AIOrchestrationService

logger = structlog.get_logger(__name__)


@dataclass
class AgentResult:
    success: bool
    data: dict[str, Any] = field(default_factory=dict)
    error: str | None = None
    tokens_used: int = 0
    cost_usd: float = 0.0


class BaseAgent(ABC):
    """Abstract base for all AIP AI agents."""

    def __init__(self, orchestration_service: AIOrchestrationService | None = None) -> None:
        self._orchestration_service = orchestration_service or AIOrchestrationService()
        self._log = logger.bind(agent=self.agent_name)

    @property
    @abstractmethod
    def agent_name(self) -> str:
        """Human-readable name for logging and tracing."""

    @abstractmethod
    async def execute(self, context: dict[str, Any]) -> AgentResult:
        """Execute the agent's primary task.

        Args:
            context: Task-specific context dictionary.

        Returns:
            AgentResult with success flag, output data, and usage metrics.
        """

    async def _complete(self, messages: list[dict], **kwargs: Any) -> str:
        """Convenience wrapper around the orchestration service."""
        self._log.info("agent_completion_start", message_count=len(messages))
        result = await self._orchestration_service.complete(messages, **kwargs)
        self._log.info("agent_completion_done", response_length=len(result))
        return result
