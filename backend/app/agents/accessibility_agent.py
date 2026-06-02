"""Agent for deep accessibility analysis using AI."""

import json
from typing import Any

from app.agents.base import AgentResult, BaseAgent


class AccessibilityAgent(BaseAgent):
    @property
    def agent_name(self) -> str:
        return "AccessibilityAgent"

    async def execute(self, context: dict[str, Any]) -> AgentResult:
        content = context.get("content", "")
        target_audience = context.get("audience", "general")
        reading_level = context.get("reading_level", "intermediate")

        if not content:
            return AgentResult(success=False, error="content is required")

        prompt = (
            f"Analyse the following assessment question for accessibility and inclusivity.\n\n"
            f"Target audience: {target_audience}\n"
            f"Expected reading level: {reading_level}\n\n"
            f"Question:\n{content}\n\n"
            "Provide a JSON response with:\n"
            "  - reading_ease_score: estimated Flesch reading ease (0-100)\n"
            "  - grade_level: estimated US grade level\n"
            "  - accessibility_issues: list of issues found\n"
            "  - suggestions: list of improvement suggestions\n"
            "  - overall_score: float 0-1"
        )

        messages = [{"role": "user", "content": prompt}]
        try:
            raw = await self._complete(messages, max_tokens=1024)
            data = json.loads(raw)
            return AgentResult(success=True, data=data)
        except Exception as exc:
            return AgentResult(success=False, error=str(exc))
