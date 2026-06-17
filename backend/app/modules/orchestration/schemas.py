from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # system | user | assistant
    content: str


class CompletionRequest(BaseModel):
    messages: list[ChatMessage]
    model: str | None = None
    provider: str | None = None
    max_tokens: int = 4096
    temperature: float = 0.7


class CompletionResponse(BaseModel):
    content: str
    model: str
    provider: str
    prompt_tokens: int
    completion_tokens: int
    cost_usd: float
    latency_ms: int


class ModelInfo(BaseModel):
    id: str
    provider: str
    context_window: int
    supports_vision: bool = False
    key_configured: bool = True
    local: bool = False
    size_gb: float = 0.0


class OllamaStatus(BaseModel):
    reachable: bool
    base_url: str
    models: list[str]
    error: str | None = None


class CostEstimate(BaseModel):
    model: str
    estimated_prompt_tokens: int
    estimated_cost_usd: float
