"""High-level agent that coordinates the full assessment generation pipeline."""

from typing import Any

from app.agents.base import AgentResult, BaseAgent
from app.agents.framework_agent import FrameworkAgent
from app.agents.generation_agent import GenerationAgent
from app.agents.quality_agent import QualityAgent


class AssessmentAgent(BaseAgent):
    @property
    def agent_name(self) -> str:
        return "AssessmentAgent"

    async def execute(self, context: dict[str, Any]) -> AgentResult:
        """Run the full pipeline: generate → align → validate."""
        try:
            return await self._execute_pipeline(context)
        except Exception as exc:
            return AgentResult(success=False, error=str(exc))

    async def _execute_pipeline(self, context: dict[str, Any]) -> AgentResult:
        generation_agent = GenerationAgent(self._orchestration_service)
        framework_agent = FrameworkAgent(self._orchestration_service)
        quality_agent = QualityAgent(self._orchestration_service)

        # Step 1: Generate questions
        gen_result = await generation_agent.execute(context)
        if not gen_result.success:
            return AgentResult(success=False, error=f"Generation failed: {gen_result.error}")

        questions = gen_result.data.get("questions", [])
        framework = context.get("framework")
        enriched_questions = []

        for question in questions:
            enriched = dict(question)

            # Step 2: Framework alignment
            if framework:
                align_result = await framework_agent.execute({
                    "question": question.get("stem", ""),
                    "framework": framework,
                })
                if align_result.success:
                    enriched["framework_alignment"] = align_result.data.get("alignment", {})

            # Step 3: Quality validation
            quality_result = await quality_agent.execute({
                "content": question.get("stem", ""),
                "options": question.get("options", []),
                "correct_answer": question.get("correct_answer", ""),
                "metadata": question,
                "reading_level": context.get("reading_level", "intermediate"),
            })
            if quality_result.success:
                enriched["quality"] = quality_result.data

            enriched_questions.append(enriched)

        return AgentResult(
            success=True,
            data={"questions": enriched_questions, "total": len(enriched_questions)},
        )
