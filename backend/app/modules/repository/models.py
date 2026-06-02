import uuid

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AssessmentItem(Base):
    """A published, reusable assessment question stored in the repository."""

    __tablename__ = "assessment_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("generated_contents.id"), nullable=False, unique=True)
    item_code: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)
    tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    usage_count: Mapped[int] = mapped_column(nullable=False, default=0)
    average_difficulty: Mapped[float | None] = mapped_column(nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    content = relationship("GeneratedContent", foreign_keys=[content_id])
    creator = relationship("User", foreign_keys=[created_by])
