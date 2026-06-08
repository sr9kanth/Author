"""prompt_templates table

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-08 00:00:00.000000

Idempotent: guarded with has_table() so it is safe to run on databases
where the table already exists.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def _has_table(bind, name: str) -> bool:
    return sa.inspect(bind).has_table(name)


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "prompt_templates"):
        op.create_table(
            "prompt_templates",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("name", sa.String(500), nullable=False),
            sa.Column("version", sa.String(50), nullable=False),
            sa.Column("template_type", sa.String(100), nullable=False),
            sa.Column("system_prompt", sa.Text(), nullable=False),
            sa.Column("user_template", sa.Text(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )


def downgrade() -> None:
    bind = op.get_bind()
    if _has_table(bind, "prompt_templates"):
        op.drop_table("prompt_templates")
