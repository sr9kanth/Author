"""Agent for governance checks: bias, fairness, and compliance auditing."""

import json
from typing import Any

from app.agents.base import AgentResult, BaseAgent


class GovernanceAgent(BaseAgent):
    @property
    def agent_name(self) -> str:
        return "GovernanceAgent"

    async def execute(self, context: dict[str, Any]) -> AgentResult:
        content = context.get("content", "")
        jurisdiction = context.get("jurisdiction", "")
        audience = context.get("audience", "general")

        if not content:
            return AgentResult(success=False, error="content is required")

        prompt = (
            "You are a governance and compliance expert for educational assessments.\n\n"
            f"Jurisdiction: {jurisdiction or 'Not specified'}\n"
            f"Target audience: {audience}\n\n"
            f"Assessment content:\n{content}\n\n"
            "Analyse this content for:\n"
            "1. Potential bias (gender, cultural, socioeconomic, racial)\n"
            "2. Age-appropriateness for the audience\n"
            "3. Legal/regulatory compliance concerns for the jurisdiction\n"
            "4. Ethical concerns\n\n"
            "Respond in JSON with:\n"
            "  - bias_flags: list of specific bias concerns\n"
            "  - compliance_issues: list of compliance concerns\n"
            "  - ethical_concerns: list of ethical issues\n"
            "  - recommendations: list of remediation actions\n"
            "  - governance_score: float 0-1 (1 = fully compliant)"
        )

        messages = [{"role": "user", "content": prompt}]
        try:
            raw = await self._complete(messages, max_tokens=1024)
            data = json.loads(raw)
            return AgentResult(success=True, data=data)
        except Exception as exc:
            return AgentResult(success=False, error=str(exc))
