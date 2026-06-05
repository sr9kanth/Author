import enum
import uuid

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class JobStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class ContentStatus(str, enum.Enum):
    draft = "draft"
    generated = "generated"
    validated = "validated"
    under_review = "under_review"
    approved = "approved"
    published = "published"
    archived = "archived"


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus), nullable=False, default=JobStatus.pending)
    configuration_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("assessment_configurations.id"), nullable=True)
    knowledge_asset_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    ai_provider: Mapped[str] = mapped_column(String(100), nullable=False, default="anthropic")
    ai_model: Mapped[str] = mapped_column(String(200), nullable=False, default="claude-opus-4-8")
    prompt_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt_version: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0")
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    configuration = relationship("AssessmentConfiguration", foreign_keys=[configuration_id])
    creator = relationship("User", foreign_keys=[created_by])
    contents: Mapped[list["GeneratedContent"]] = relationship("GeneratedContent", back_populates="job", cascade="all, delete-orphan")


class Stimulus(Base):
    __tablename__ = "stimuli"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    stimulus_type: Mapped[str] = mapped_column(String(100), nullable=False, default="scenario")
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    creator = relationship("User", foreign_keys=[created_by])
    contents: Mapped[list["GeneratedContent"]] = relationship("GeneratedContent", back_populates="stimulus")


class GeneratedContent(Base):
    __tablename__ = "generated_contents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("generation_jobs.id"), nullable=False)
    stimulus_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("stimuli.id"), nullable=True)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)  # question, answer, rationale
    body: Mapped[str] = mapped_column(Text, nullable=False)
    content_metadata: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    framework_alignment: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    source_references: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    ai_provider: Mapped[str] = mapped_column(String(100), nullable=False, default="anthropic")
    ai_model: Mapped[str] = mapped_column(String(200), nullable=False, default="claude-opus-4-8")
    prompt_version: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0")
    status: Mapped[ContentStatus] = mapped_column(Enum(ContentStatus), nullable=False, default=ContentStatus.draft)
    validation_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    job: Mapped[GenerationJob] = relationship("GenerationJob", back_populates="contents")
    stimulus: Mapped["Stimulus | None"] = relationship("Stimulus", back_populates="contents")
