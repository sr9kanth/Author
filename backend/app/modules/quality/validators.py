"""Individual validation services for generated assessment content."""

import re
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    score: float  # 0.0 - 1.0
    passed: bool
    issues: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)


class GrammarValidator:
    """Basic grammar and spelling validation."""

    async def validate(self, content: str, context: dict) -> ValidationResult:
        issues = []
        recommendations = []

        # Check for double spaces
        if "  " in content:
            issues.append("Double spaces detected")
            recommendations.append("Remove extra whitespace")

        # Check for sentence capitalization
        sentences = re.split(r"(?<=[.!?])\s+", content)
        uncapitalized = [s for s in sentences if s and not s[0].isupper()]
        if uncapitalized:
            issues.append(f"{len(uncapitalized)} sentence(s) not capitalised")
            recommendations.append("Ensure all sentences begin with a capital letter")

        score = max(0.0, 1.0 - (len(issues) * 0.2))
        return ValidationResult(score=score, passed=score >= 0.7, issues=issues, recommendations=recommendations)


class DuplicateDetector:
    """Detects duplicate or near-duplicate questions."""

    async def validate(self, content: str, context: dict) -> ValidationResult:
        existing_questions: list[str] = context.get("existing_questions", [])
        content_lower = content.lower().strip()

        for existing in existing_questions:
            if content_lower == existing.lower().strip():
                return ValidationResult(
                    score=0.0,
                    passed=False,
                    issues=["Exact duplicate question detected"],
                    recommendations=["Rewrite the question to be unique"],
                )

        # Jaccard similarity check
        content_words = set(content_lower.split())
        for existing in existing_questions:
            existing_words = set(existing.lower().split())
            intersection = content_words & existing_words
            union = content_words | existing_words
            if union and len(intersection) / len(union) > 0.85:
                return ValidationResult(
                    score=0.3,
                    passed=False,
                    issues=["Near-duplicate question detected (>85% word overlap)"],
                    recommendations=["Substantially rewrite the question"],
                )

        return ValidationResult(score=1.0, passed=True)


class AmbiguityDetector:
    """Detects ambiguous language in questions."""

    AMBIGUOUS_TERMS = [
        "usually", "sometimes", "often", "generally", "typically",
        "may", "might", "could", "possibly", "perhaps", "in some cases",
    ]

    async def validate(self, content: str, context: dict) -> ValidationResult:
        issues = []
        recommendations = []
        content_lower = content.lower()

        found_terms = [term for term in self.AMBIGUOUS_TERMS if term in content_lower]
        if found_terms:
            issues.append(f"Ambiguous qualifier(s) found: {', '.join(found_terms)}")
            recommendations.append("Replace vague qualifiers with precise language")

        score = max(0.0, 1.0 - (len(found_terms) * 0.15))
        return ValidationResult(score=score, passed=score >= 0.7, issues=issues, recommendations=recommendations)


class BiasDetector:
    """Detects potentially biased language."""

    BIAS_PATTERNS = [
        r"\b(he|she)\b(?!\s+or\s+she)",
        r"\bmanpower\b",
        r"\bchairman\b",
        r"\bstewardess\b",
    ]

    async def validate(self, content: str, context: dict) -> ValidationResult:
        issues = []
        recommendations = []

        for pattern in self.BIAS_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                issues.append(f"Potentially biased language pattern detected: {pattern}")
                recommendations.append("Use gender-neutral and inclusive language")

        score = max(0.0, 1.0 - (len(issues) * 0.25))
        return ValidationResult(score=score, passed=score >= 0.75, issues=issues, recommendations=recommendations)


class AccessibilityValidator:
    """Validates content for accessibility compliance."""

    async def validate(self, content: str, context: dict) -> ValidationResult:
        issues = []
        recommendations = []

        # Check sentence length
        sentences = re.split(r"[.!?]+", content)
        long_sentences = [s for s in sentences if len(s.split()) > 40]
        if long_sentences:
            issues.append(f"{len(long_sentences)} sentence(s) exceed 40 words")
            recommendations.append("Break long sentences into shorter, clearer statements")

        # Check for jargon without definition
        word_count = len(content.split())
        if word_count < 10:
            issues.append("Question is too short to be meaningful")
            recommendations.append("Expand the question with sufficient context")

        score = max(0.0, 1.0 - (len(issues) * 0.2))
        return ValidationResult(score=score, passed=score >= 0.7, issues=issues, recommendations=recommendations)


class AnswerValidator:
    """Validates that correct answers are unambiguously correct."""

    async def validate(self, content: str, context: dict) -> ValidationResult:
        issues = []
        recommendations = []

        options: list[str] = context.get("options", [])
        correct_answer: str = context.get("correct_answer", "")

        if options and correct_answer not in options:
            issues.append("Correct answer is not present in the answer options")
            recommendations.append("Ensure the correct answer matches one of the provided options exactly")

        if options and len(options) < 3:
            issues.append("Multiple-choice questions should have at least 3 options")
            recommendations.append("Add more plausible distractors")

        score = 1.0 if not issues else 0.0
        return ValidationResult(score=score, passed=score >= 1.0, issues=issues, recommendations=recommendations)


class FrameworkAlignmentValidator:
    """Validates alignment of content with the assessment framework."""

    async def validate(self, content: str, context: dict) -> ValidationResult:
        issues = []
        recommendations = []

        framework_alignment: dict = context.get("framework_alignment", {})
        if not framework_alignment:
            issues.append("No framework alignment data provided")
            recommendations.append("Map the content to competencies in the assessment framework")
            return ValidationResult(score=0.5, passed=False, issues=issues, recommendations=recommendations)

        confidence = framework_alignment.get("confidence", 0.0)
        if confidence < 0.6:
            issues.append(f"Low framework alignment confidence: {confidence:.2f}")
            recommendations.append("Review and manually confirm framework mapping")

        score = float(confidence)
        return ValidationResult(score=score, passed=score >= 0.6, issues=issues, recommendations=recommendations)


class DifficultyPredictor:
    """Predicts and validates the difficulty of a question."""

    async def validate(self, content: str, context: dict) -> ValidationResult:
        issues = []
        recommendations = []

        declared_difficulty: str = context.get("metadata", {}).get("difficulty", "")
        word_count = len(content.split())

        # Very rough heuristic – real implementation would use ML
        if word_count < 15 and declared_difficulty == "hard":
            issues.append("Short question declared as hard; verify difficulty level")
            recommendations.append("Review whether difficulty rating is appropriate")

        score = 1.0 if not issues else 0.7
        return ValidationResult(score=score, passed=True, issues=issues, recommendations=recommendations)


class ReadingLevelAnalyzer:
    """Estimates reading level of the content."""

    async def validate(self, content: str, context: dict) -> ValidationResult:
        issues = []
        recommendations = []

        target_level: str = context.get("reading_level", "intermediate")
        words = content.split()
        sentences = re.split(r"[.!?]+", content)
        sentence_count = max(len([s for s in sentences if s.strip()]), 1)
        avg_words_per_sentence = len(words) / sentence_count

        if target_level == "basic" and avg_words_per_sentence > 20:
            issues.append(f"Average sentence length ({avg_words_per_sentence:.1f} words) may be too complex for basic level")
            recommendations.append("Simplify sentence structure for the target audience")

        score = 1.0 if not issues else 0.75
        return ValidationResult(score=score, passed=score >= 0.7, issues=issues, recommendations=recommendations)


class HallucinationDetector:
    """Detects potential AI hallucinations by checking factual consistency."""

    async def validate(self, content: str, context: dict) -> ValidationResult:
        issues = []
        recommendations = []

        source_text: str = context.get("source_text", "")
        if not source_text:
            return ValidationResult(
                score=0.5,
                passed=True,
                issues=["No source text provided for hallucination check"],
                recommendations=["Provide source knowledge assets to verify factual accuracy"],
            )

        # Basic keyword overlap check; production would use embedding similarity
        content_words = set(content.lower().split())
        source_words = set(source_text.lower().split())
        overlap = len(content_words & source_words) / max(len(content_words), 1)

        if overlap < 0.1:
            issues.append("Low keyword overlap with source material; possible hallucination")
            recommendations.append("Verify all factual claims against the source knowledge assets")

        score = min(1.0, overlap * 2)
        return ValidationResult(score=score, passed=score >= 0.3, issues=issues, recommendations=recommendations)
