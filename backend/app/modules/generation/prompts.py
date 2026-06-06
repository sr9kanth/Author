"""Prompt templates for AI-driven question generation."""

QUESTION_GENERATION_SYSTEM = """You are an expert assessment author specialising in creating high-quality
examination questions. Your questions are accurate, unambiguous, fair, and aligned with the specified
cognitive levels and learning outcomes."""


def build_system_prompt(guide_text: str | None = None) -> str:
    """Build the system prompt, appending an item authoring guide when provided."""
    if guide_text and guide_text.strip():
        return f"{QUESTION_GENERATION_SYSTEM}\n\n## Item Authoring Guide\n{guide_text.strip()}"
    return QUESTION_GENERATION_SYSTEM

QUESTION_GENERATION_USER_TEMPLATE = """Generate {question_count} {question_type} questions based on
the following knowledge content.

Requirements:
- Difficulty distribution: {difficulty_levels}
- Cognitive levels (Bloom's Taxonomy): {cognitive_levels}
- Reading level: {reading_level}
- Target audience: {audience}
- Language: {language}
{framework_context}

Knowledge Content:
{knowledge_content}

For each question, output a JSON object with:
  - question_type: the type of question
  - stem: the question text
  - options: list of answer choices (for multiple-choice / multi-select)
  - correct_answer: the correct answer or answers
  - rationale: explanation of the correct answer
  - difficulty: easy | medium | hard
  - cognitive_level: remember | understand | apply | analyse | evaluate | create
  - keywords: list of relevant keywords

Return a JSON array of question objects only, no additional text."""

FRAMEWORK_ALIGNMENT_TEMPLATE = """Analyse the following assessment question and map it to the provided
competency framework.

Question:
{question}

Framework:
{framework}

Return a JSON object with:
  - competency_ids: list of matched competency UUIDs
  - skill_ids: list of matched skill UUIDs
  - learning_outcome_ids: list of matched learning outcome UUIDs
  - confidence: float between 0 and 1
  - rationale: brief explanation"""
