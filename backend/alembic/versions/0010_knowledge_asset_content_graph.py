"""content_graph JSON column on knowledge_assets

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-08 00:00:00.000000

Idempotent: guards column addition so the migration is safe to run on
databases that already have the column.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def _has_column(bind, table: str, column: str) -> bool:
    insp = sa.inspect(bind)
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    bind = op.get_bind()
    if not _has_column(bind, "knowledge_assets", "content_graph"):
        op.add_column(
            "knowledge_assets",
            sa.Column("content_graph", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    if _has_column(bind, "knowledge_assets", "content_graph"):
        op.drop_column("knowledge_assets", "content_graph")
