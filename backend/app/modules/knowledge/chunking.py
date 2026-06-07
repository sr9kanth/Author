"""Simple word-based text chunker for RAG indexing."""

# Rough heuristic: ~0.75 words per token (i.e. ~1.33 tokens per word).
_WORDS_PER_TOKEN = 0.75


def chunk_text(text: str, target_tokens: int = 400, overlap_tokens: int = 60) -> list[str]:
    """Split text into overlapping word-based chunks.

    Sizes are expressed in tokens and converted to word counts via a rough
    0.75 words/token heuristic. Empty/whitespace-only chunks are skipped.
    """
    if not text or not text.strip():
        return []

    words = text.split()
    if not words:
        return []

    target_words = max(1, int(target_tokens * _WORDS_PER_TOKEN))
    overlap_words = max(0, int(overlap_tokens * _WORDS_PER_TOKEN))
    # Guard against an overlap >= window (would loop forever).
    step = max(1, target_words - overlap_words)

    chunks: list[str] = []
    for start in range(0, len(words), step):
        window = words[start : start + target_words]
        chunk = " ".join(window).strip()
        if chunk:
            chunks.append(chunk)
        if start + target_words >= len(words):
            break
    return chunks
