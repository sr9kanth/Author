"""Quality validation orchestration service."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.quality.models import QualityValidation
from app.modules.quality.schemas import QualityReport, QualityValidationRead, ValidationResult
from app.modules.quality.validators import (
    AccessibilityValidator,
    AmbiguityDetector,
    AnswerValidator,
    BiasDetector,
    DifficultyPredictor,
    DuplicateDetector,
    FrameworkAlignmentValidator,
    GrammarValidator,
    HallucinationDetector,
    ReadingLevelAnalyzer,
)

# Relative importance of each validator for the weighted overall score.
VALIDATOR_WEIGHTS = {
    "hallucination": 0.30,
    "answer": 0.20,
    "framework_alignment": 0.15,
    "ambiguity": 0.10,
    "duplicate": 0.08,
    "grammar": 0.05,
    "accessibility": 0.05,
    "reading_level": 0.04,
    "bias": 0.02,
    "difficulty": 0.01,
}

# Validators that gate the overall pass/fail regardless of score.
CRITICAL_VALIDATORS = {"hallucination", "answer"}

ALL_VALIDATORS = {
    "grammar": GrammarValidator,
    "duplicate": DuplicateDetector,
    "ambiguity": AmbiguityDetector,
    "bias": BiasDetector,
    "accessibility": AccessibilityValidator,
    "answer": AnswerValidator,
    "framework_alignment": FrameworkAlignmentValidator,
    "difficulty": DifficultyPredictor,
    "reading_level": ReadingLevelAnalyzer,
    "hallucination": HallucinationDetector,
}


class QualityService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def validate_content(
        self,
        content_id: str,
        content_text: str,
        context: dict,
        validator_names: list[str] | None = None,
    ) -> QualityReport:
        names = validator_names or list(ALL_VALIDATORS.keys())
        results: list[ValidationResult] = []

        for name in names:
            validator_cls = ALL_VALIDATORS.get(name)
            if not validator_cls:
                continue
            validator = validator_cls()
            result = await validator.validate(content_text, context)

            record = QualityValidation(
                content_id=uuid.UUID(content_id),
                validator_name=name,
                score=result.score,
                passed=result.passed,
                issues=result.issues,
                recommendations=result.recommendations,
                raw_result={"score": result.score, "passed": result.passed},
            )
            self.db.add(record)

            results.append(ValidationResult(
                validator_name=name,
                score=result.score,
                passed=result.passed,
                issues=result.issues,
                recommendations=result.recommendations,
            ))

        await self.db.flush()

        # Weighted overall score, renormalized over the validators that ran.
        present_weights = {r.validator_name: VALIDATOR_WEIGHTS.get(r.validator_name, 0.0) for r in results}
        total_weight = sum(present_weights.values())
        if results and total_weight > 0:
            overall_score = sum(r.score * present_weights[r.validator_name] for r in results) / total_weight
        elif results:
            # No configured weights for the subset; fall back to flat average.
            overall_score = sum(r.score for r in results) / len(results)
        else:
            overall_score = 0.0

        all_passed = all(r.passed for r in results)

        # Critical gating: a failed critical validator forces overall failure and
        # caps the overall score.
        critical_failed = any(
            r.validator_name in CRITICAL_VALIDATORS and not r.passed for r in results
        )
        if critical_failed:
            all_passed = False
            overall_score = min(overall_score, 0.5)

        return QualityReport(
            content_id=content_id,
            overall_score=round(overall_score, 3),
            passed=all_passed,
            validations=results,
        )

    async def get_validations(self, content_id: str) -> list[QualityValidationRead]:
        result = await self.db.execute(
            select(QualityValidation).where(QualityValidation.content_id == uuid.UUID(content_id))
        )
        return [QualityValidationRead.model_validate(v) for v in result.scalars().all()]
