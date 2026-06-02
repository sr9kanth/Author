import uuid

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class QualityValidation(Base):
    __tablename__ = "quality_validations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("generated_contents.id"), nullable=False)
    validator_name: Mapped[str] = mapped_column(String(100), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    passed: Mapped[bool] = mapped_column(nullable=False, default=False)
    issues: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    recommendations: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    raw_result: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    content = relationship("GeneratedContent", foreign_keys=[content_id])
