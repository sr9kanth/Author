"""Agent that orchestrates all quality validators for a piece of content."""

from typing import Any

from app.agents.base import AgentResult, BaseAgent
from app.modules.quality.validators import (
    AccessibilityValidator,
    AmbiguityDetector,
    AnswerValidator,
    BiasDetector,
    GrammarValidator,
    HallucinationDetector,
    ReadingLevelAnalyzer,
)


class QualityAgent(BaseAgent):
    @property
    def agent_name(self) -> str:
        return "QualityAgent"

    async def execute(self, context: dict[str, Any]) -> AgentResult:
        content = context.get("content", "")
        if not content:
            return AgentResult(success=False, error="content is required")

        validators = [
            GrammarValidator(),
            AmbiguityDetector(),
            BiasDetector(),
            AccessibilityValidator(),
            AnswerValidator(),
            ReadingLevelAnalyzer(),
            HallucinationDetector(),
        ]

        results = []
        for validator in validators:
            result = await validator.validate(content, context)
            results.append({
                "validator": validator.__class__.__name__,
                "score": result.score,
                "passed": result.passed,
                "issues": result.issues,
                "recommendations": result.recommendations,
            })

        overall_score = sum(r["score"] for r in results) / len(results) if results else 0.0
        return AgentResult(
            success=True,
            data={
                "validations": results,
                "overall_score": round(overall_score, 3),
                "passed": all(r["passed"] for r in results),
            },
        )
