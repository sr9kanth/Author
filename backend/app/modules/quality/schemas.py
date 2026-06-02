import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ValidationResult(BaseModel):
    validator_name: str
    score: float  # 0.0 - 1.0
    passed: bool
    issues: list[str]
    recommendations: list[str]


class QualityValidationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    content_id: uuid.UUID
    validator_name: str
    score: float
    passed: bool
    issues: list
    recommendations: list
    created_at: datetime


class QualityValidationRequest(BaseModel):
    content_id: str
    validators: list[str] | None = None  # None = run all


class QualityReport(BaseModel):
    content_id: str
    overall_score: float
    passed: bool
    validations: list[ValidationResult]
