"""Agent responsible for generating assessment questions."""

import json
import re
from typing import Any

from app.agents.base import AgentResult, BaseAgent
from app.modules.generation.prompts import QUESTION_GENERATION_SYSTEM, QUESTION_GENERATION_USER_TEMPLATE, build_system_prompt


def _parse_questions(raw: str) -> list[dict]:
    """Robustly extract a JSON array of question objects from a model response.

    Models (esp. DeepSeek) frequently wrap JSON in ```json fences or add a
    sentence of preamble despite instructions. Strip fences, then fall back to
    locating the first '[' .. last ']' span. Also accept an object with a
    top-level "questions" array.
    """
    text = raw.strip()

    # Strip ```json ... ``` or ``` ... ``` fences.
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    def _sanitize(s: str) -> str:
        # Replace literal control characters inside JSON strings with their
        # escaped equivalents so json.loads doesn't reject them. Only touches
        # chars that are valid JSON escape sequences.
        return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', lambda m: repr(m.group())[1:-1], s)

    def _coerce(parsed: Any) -> list[dict]:
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict) and isinstance(parsed.get("questions"), list):
            return parsed["questions"]
        raise ValueError("Parsed JSON is not a list of questions")

    for attempt in (text, _sanitize(text)):
        try:
            return _coerce(json.loads(attempt))
        except (json.JSONDecodeError, ValueError):
            pass

    # Fall back to the widest [...] span.
    for candidate in (text, _sanitize(text)):
        start, end = candidate.find("["), candidate.rfind("]")
        if start != -1 and end != -1 and end > start:
            try:
                return _coerce(json.loads(candidate[start:end + 1]))
            except (json.JSONDecodeError, ValueError):
                pass

        start, end = candidate.find("{"), candidate.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return _coerce(json.loads(candidate[start:end + 1]))
            except (json.JSONDecodeError, ValueError):
                pass

    raise json.JSONDecodeError("No JSON array/object found in response", text, 0)


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

        # Try to load active generation prompt template from DB; fall back to hardcoded on any failure
        active_system_prompt: str | None = None
        active_user_template: str | None = None
        try:
            db = context.get("db")
            if db is not None:
                from app.modules.prompts.service import PromptTemplateService
                pt_service = PromptTemplateService(db)
                active_pt = await pt_service.get_active_template("generation")
                if active_pt is not None:
                    active_system_prompt = active_pt.system_prompt
                    active_user_template = active_pt.user_template
        except Exception:
            pass

        user_template = active_user_template if active_user_template else QUESTION_GENERATION_USER_TEMPLATE
        user_prompt = user_template.format(
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

        if active_system_prompt:
            system_prompt = active_system_prompt
            if context.get("guide_text") and context["guide_text"].strip():
                system_prompt = f"{system_prompt}\n\n## Item Authoring Guide\n{context['guide_text'].strip()}"
        else:
            system_prompt = build_system_prompt(context.get("guide_text"))
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        try:
            raw = await self._complete(
                messages,
                max_tokens=8192,
                model=context.get("ai_model"),
                provider=context.get("ai_provider"),
            )
            questions = _parse_questions(raw)
            return AgentResult(success=True, data={"questions": questions})
        except json.JSONDecodeError as exc:
            return AgentResult(success=False, error=f"Failed to parse AI response as JSON: {exc}")
        except Exception as exc:
            return AgentResult(success=False, error=str(exc))
