"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-05 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---------------------------------------------------------------------------
    # Extensions
    # ---------------------------------------------------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ---------------------------------------------------------------------------
    # Enum types
    # ---------------------------------------------------------------------------
    userrole = postgresql.ENUM(
        "administrator",
        "assessment_manager",
        "author",
        "reviewer",
        "auditor",
        "read_only",
        name="userrole",
    )
    userrole.create(op.get_bind(), checkfirst=True)

    contenttype = postgresql.ENUM(
        "pdf",
        "docx",
        "pptx",
        "xlsx",
        "csv",
        "html",
        "url",
        "markdown",
        "text",
        name="contenttype",
    )
    contenttype.create(op.get_bind(), checkfirst=True)

    assetstatus = postgresql.ENUM(
        "uploaded",
        "processing",
        "processed",
        "failed",
        name="assetstatus",
    )
    assetstatus.create(op.get_bind(), checkfirst=True)

    jobstatus = postgresql.ENUM(
        "pending",
        "running",
        "completed",
        "failed",
        name="jobstatus",
    )
    jobstatus.create(op.get_bind(), checkfirst=True)

    contentstatus = postgresql.ENUM(
        "draft",
        "generated",
        "validated",
        "under_review",
        "approved",
        "published",
        "archived",
        name="contentstatus",
    )
    contentstatus.create(op.get_bind(), checkfirst=True)

    workflowstate = postgresql.ENUM(
        "draft",
        "generated",
        "validated",
        "under_review",
        "approved",
        "published",
        "archived",
        name="workflowstate",
    )
    workflowstate.create(op.get_bind(), checkfirst=True)

    # ---------------------------------------------------------------------------
    # Table: users
    # ---------------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum(
                "administrator",
                "assessment_manager",
                "author",
                "reviewer",
                "auditor",
                "read_only",
                name="userrole",
            ),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("mfa_enabled", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ---------------------------------------------------------------------------
    # Table: frameworks
    # ---------------------------------------------------------------------------
    op.create_table(
        "frameworks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("version", sa.String(50), nullable=False),
        sa.Column("domain", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ---------------------------------------------------------------------------
    # Table: domains
    # ---------------------------------------------------------------------------
    op.create_table(
        "domains",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "framework_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("frameworks.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ---------------------------------------------------------------------------
    # Table: competencies
    # ---------------------------------------------------------------------------
    op.create_table(
        "competencies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "domain_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("domains.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("code", sa.String(50), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ---------------------------------------------------------------------------
    # Table: skills
    # ---------------------------------------------------------------------------
    op.create_table(
        "skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "competency_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("competencies.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("code", sa.String(50), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ---------------------------------------------------------------------------
    # Table: learning_outcomes
    # ---------------------------------------------------------------------------
    op.create_table(
        "learning_outcomes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "skill_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("skills.id"),
            nullable=False,
        ),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("bloom_level", sa.String(50), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ---------------------------------------------------------------------------
    # Table: knowledge_assets
    # ---------------------------------------------------------------------------
    op.create_table(
        "knowledge_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "content_type",
            sa.Enum(
                "pdf",
                "docx",
                "pptx",
                "xlsx",
                "csv",
                "html",
                "url",
                "markdown",
                "text",
                name="contenttype",
            ),
            nullable=False,
        ),
        sa.Column("storage_path", sa.String(1000), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("extracted_topics", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("extracted_concepts", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("extracted_outcomes", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("keywords", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "uploaded",
                "processing",
                "processed",
                "failed",
                name="assetstatus",
            ),
            nullable=False,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ---------------------------------------------------------------------------
    # Table: assessment_configurations
    # ---------------------------------------------------------------------------
    op.create_table(
        "assessment_configurations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("question_types", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("difficulty_levels", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("cognitive_levels", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("question_count", sa.Integer(), nullable=False),
        sa.Column("reading_level", sa.String(100), nullable=False),
        sa.Column("language", sa.String(50), nullable=False),
        sa.Column("audience", sa.String(255), nullable=True),
        sa.Column("jurisdiction", sa.String(255), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column(
            "framework_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("frameworks.id"),
            nullable=True,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ---------------------------------------------------------------------------
    # Table: generation_jobs
    # ---------------------------------------------------------------------------
    op.create_table(
        "generation_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "running",
                "completed",
                "failed",
                name="jobstatus",
            ),
            nullable=False,
        ),
        sa.Column(
            "configuration_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("assessment_configurations.id"),
            nullable=True,
        ),
        sa.Column("knowledge_asset_ids", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("ai_provider", sa.String(100), nullable=False),
        sa.Column("ai_model", sa.String(200), nullable=False),
        sa.Column("prompt_template", sa.Text(), nullable=True),
        sa.Column("prompt_version", sa.String(50), nullable=False),
        sa.Column("celery_task_id", sa.String(255), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ---------------------------------------------------------------------------
    # Table: generated_contents
    # ---------------------------------------------------------------------------
    op.create_table(
        "generated_contents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("generation_jobs.id"),
            nullable=False,
        ),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("content_metadata", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("framework_alignment", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("source_references", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("ai_provider", sa.String(100), nullable=False),
        sa.Column("ai_model", sa.String(200), nullable=False),
        sa.Column("prompt_version", sa.String(50), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "draft",
                "generated",
                "validated",
                "under_review",
                "approved",
                "published",
                "archived",
                name="contentstatus",
            ),
            nullable=False,
        ),
        sa.Column("validation_score", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ---------------------------------------------------------------------------
    # Table: quality_validations
    # ---------------------------------------------------------------------------
    op.create_table(
        "quality_validations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "content_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("generated_contents.id"),
            nullable=False,
        ),
        sa.Column("validator_name", sa.String(100), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("passed", sa.Boolean(), nullable=False),
        sa.Column("issues", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("recommendations", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("raw_result", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ---------------------------------------------------------------------------
    # Table: assessment_items  (repository)
    # ---------------------------------------------------------------------------
    op.create_table(
        "assessment_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "content_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("generated_contents.id"),
            nullable=False,
        ),
        sa.Column("item_code", sa.String(100), nullable=True),
        sa.Column("tags", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("usage_count", sa.Integer(), nullable=False),
        sa.Column("average_difficulty", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("content_id", name="uq_assessment_items_content_id"),
        sa.UniqueConstraint("item_code", name="uq_assessment_items_item_code"),
    )

    # ---------------------------------------------------------------------------
    # Table: assessment_packages  (assembly)
    # ---------------------------------------------------------------------------
    op.create_table(
        "assessment_packages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "configuration_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("assessment_configurations.id"),
            nullable=True,
        ),
        sa.Column("item_ids", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("export_formats", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("package_metadata", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ---------------------------------------------------------------------------
    # Table: review_workflows  (workflow)
    # ---------------------------------------------------------------------------
    op.create_table(
        "review_workflows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "content_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("generated_contents.id"),
            nullable=False,
        ),
        sa.Column(
            "current_state",
            sa.Enum(
                "draft",
                "generated",
                "validated",
                "under_review",
                "approved",
                "published",
                "archived",
                name="workflowstate",
            ),
            nullable=False,
        ),
        sa.Column(
            "assigned_reviewer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("content_id", name="uq_review_workflows_content_id"),
    )

    # ---------------------------------------------------------------------------
    # Table: workflow_events
    # ---------------------------------------------------------------------------
    op.create_table(
        "workflow_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workflow_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("review_workflows.id"),
            nullable=False,
        ),
        sa.Column(
            "from_state",
            sa.Enum(
                "draft",
                "generated",
                "validated",
                "under_review",
                "approved",
                "published",
                "archived",
                name="workflowstate",
            ),
            nullable=False,
        ),
        sa.Column(
            "to_state",
            sa.Enum(
                "draft",
                "generated",
                "validated",
                "under_review",
                "approved",
                "published",
                "archived",
                name="workflowstate",
            ),
            nullable=False,
        ),
        sa.Column(
            "triggered_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("event_metadata", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ---------------------------------------------------------------------------
    # Table: review_comments
    # ---------------------------------------------------------------------------
    op.create_table(
        "review_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workflow_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("review_workflows.id"),
            nullable=False,
        ),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("resolved", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ---------------------------------------------------------------------------
    # Table: ai_usage_logs  (orchestration — no FK dependencies)
    # ---------------------------------------------------------------------------
    op.create_table(
        "ai_usage_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("provider", sa.String(100), nullable=False),
        sa.Column("model", sa.String(200), nullable=False),
        sa.Column("prompt_tokens", sa.Integer(), nullable=False),
        sa.Column("completion_tokens", sa.Integer(), nullable=False),
        sa.Column("total_tokens", sa.Integer(), nullable=False),
        sa.Column("cost_usd", sa.Float(), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("request_metadata", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("ai_usage_logs")
    op.drop_table("review_comments")
    op.drop_table("workflow_events")
    op.drop_table("review_workflows")
    op.drop_table("assessment_packages")
    op.drop_table("assessment_items")
    op.drop_table("quality_validations")
    op.drop_table("generated_contents")
    op.drop_table("generation_jobs")
    op.drop_table("assessment_configurations")
    op.drop_table("knowledge_assets")
    op.drop_table("learning_outcomes")
    op.drop_table("skills")
    op.drop_table("competencies")
    op.drop_table("domains")
    op.drop_table("frameworks")
    op.drop_table("users")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS workflowstate")
    op.execute("DROP TYPE IF EXISTS contentstatus")
    op.execute("DROP TYPE IF EXISTS jobstatus")
    op.execute("DROP TYPE IF EXISTS assetstatus")
    op.execute("DROP TYPE IF EXISTS contenttype")
    op.execute("DROP TYPE IF EXISTS userrole")
