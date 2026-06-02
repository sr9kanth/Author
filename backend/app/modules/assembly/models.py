import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AssessmentPackage(Base):
    """A final assembled assessment package ready for delivery."""

    __tablename__ = "assessment_packages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    configuration_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("assessment_configurations.id"), nullable=True)
    item_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)  # ordered list of AssessmentItem UUIDs
    export_formats: Mapped[list] = mapped_column(JSON, nullable=False, default=list)  # e.g. ["pdf", "qti", "docx"]
    package_metadata: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    configuration = relationship("AssessmentConfiguration", foreign_keys=[configuration_id])
    creator = relationship("User", foreign_keys=[created_by])
