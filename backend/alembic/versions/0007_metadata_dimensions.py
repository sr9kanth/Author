"""metadata_dimensions table

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-08 00:00:00.000000

Idempotent: guarded with has_table() so it is safe to run on databases
where the table already exists.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def _has_table(bind, name: str) -> bool:
    return sa.inspect(bind).has_table(name)


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "metadata_dimensions"):
        op.create_table(
            "metadata_dimensions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("key", sa.String(255), nullable=False),
            sa.Column("value_type", sa.String(50), nullable=False, server_default="dictionary_single"),
            sa.Column("dimension_values", postgresql.JSON(), nullable=False, server_default="[]"),
            sa.Column("explanation", sa.Text(), nullable=True),
            sa.Column("scopes", postgresql.JSON(), nullable=False, server_default="[]"),
            sa.Column("source", sa.String(50), nullable=False, server_default="defined"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )


def downgrade() -> None:
    bind = op.get_bind()
    if _has_table(bind, "metadata_dimensions"):
        op.drop_table("metadata_dimensions")
