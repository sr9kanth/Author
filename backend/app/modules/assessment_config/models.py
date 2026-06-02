import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AssessmentConfiguration(Base):
    __tablename__ = "assessment_configurations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # JSON arrays / objects for flexible config
    question_types: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    difficulty_levels: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    cognitive_levels: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    question_count: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    reading_level: Mapped[str] = mapped_column(String(100), nullable=False, default="intermediate")
    language: Mapped[str] = mapped_column(String(50), nullable=False, default="en")
    audience: Mapped[str | None] = mapped_column(String(255), nullable=True)
    jurisdiction: Mapped[str | None] = mapped_column(String(255), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)

    framework_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("frameworks.id"), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    framework = relationship("Framework", foreign_keys=[framework_id])
    creator = relationship("User", foreign_keys=[created_by])
