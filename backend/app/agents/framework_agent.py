"""Agent responsible for mapping questions to assessment frameworks."""

import json
from typing import Any

from app.agents.base import AgentResult, BaseAgent
from app.modules.generation.prompts import FRAMEWORK_ALIGNMENT_TEMPLATE


class FrameworkAgent(BaseAgent):
    @property
    def agent_name(self) -> str:
        return "FrameworkAgent"

    async def execute(self, context: dict[str, Any]) -> AgentResult:
        question = context.get("question", "")
        framework = context.get("framework", {})

        if not question or not framework:
            return AgentResult(success=False, error="question and framework are required")

        prompt = FRAMEWORK_ALIGNMENT_TEMPLATE.format(
            question=question,
            framework=json.dumps(framework, indent=2),
        )
        messages = [{"role": "user", "content": prompt}]

        try:
            raw = await self._complete(messages, max_tokens=1024)
            alignment = json.loads(raw)
            return AgentResult(success=True, data={"alignment": alignment})
        except json.JSONDecodeError as exc:
            return AgentResult(success=False, error=f"Failed to parse alignment response: {exc}")
        except Exception as exc:
            return AgentResult(success=False, error=str(exc))
