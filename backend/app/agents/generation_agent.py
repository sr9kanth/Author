"""Agent responsible for generating assessment questions."""

import json
from typing import Any

from app.agents.base import AgentResult, BaseAgent
from app.modules.generation.prompts import QUESTION_GENERATION_SYSTEM, QUESTION_GENERATION_USER_TEMPLATE


class GenerationAgent(BaseAgent):
    @property
    def agent_name(self) -> str:
        return "GenerationAgent"

    async def execute(self, context: dict[str, Any]) -> AgentResult:
        knowledge_content = context.get("knowledge_content", "")
        question_count = context.get("question_count", 10)
        question_type = context.get("question_type", "multiple_choice")
        difficulty_levels = context.get("difficulty_levels", {"easy": 3, "medium": 5, "hard": 2})
        cognitive_levels = context.get("cognitive_levels", {"remember": 3, "understand": 4, "apply": 3})
        reading_level = context.get("reading_level", "intermediate")
        audience = context.get("audience", "general")
        language = context.get("language", "en")
        framework_context = context.get("framework_context", "")

        user_prompt = QUESTION_GENERATION_USER_TEMPLATE.format(
            question_count=question_count,
            question_type=question_type,
            difficulty_levels=json.dumps(difficulty_levels),
            cognitive_levels=json.dumps(cognitive_levels),
            reading_level=reading_level,
            audience=audience,
            language=language,
            framework_context=f"\nFramework context:\n{framework_context}" if framework_context else "",
            knowledge_content=knowledge_content[:6000],
        )

        messages = [
            {"role": "system", "content": QUESTION_GENERATION_SYSTEM},
            {"role": "user", "content": user_prompt},
        ]

        try:
            raw = await self._complete(messages, max_tokens=8192)
            questions = json.loads(raw)
            return AgentResult(success=True, data={"questions": questions})
        except json.JSONDecodeError as exc:
            return AgentResult(success=False, error=f"Failed to parse AI response as JSON: {exc}")
        except Exception as exc:
            return AgentResult(success=False, error=str(exc))
