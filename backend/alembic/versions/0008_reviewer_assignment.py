"""reviewer assignment columns on generated_contents

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-08 00:00:00.000000

Idempotent: guards column additions so the migration is safe to run on
databases that already have the columns (e.g. fresh dev envs from the
model definition).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0008b"
down_revision = "0008"
branch_labels = None
depends_on = None


def _has_column(bind, table: str, column: str) -> bool:
    try:
        return any(c["name"] == column for c in sa.inspect(bind).get_columns(table))
    except Exception:
        return False


def upgrade() -> None:
    bind = op.get_bind()
    if not _has_column(bind, "generated_contents", "assigned_reviewer_id"):
        op.add_column(
            "generated_contents",
            sa.Column("assigned_reviewer_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.create_foreign_key(
            "fk_generated_contents_assigned_reviewer_id",
            "generated_contents",
            "users",
            ["assigned_reviewer_id"],
            ["id"],
        )
    if not _has_column(bind, "generated_contents", "reviewed_by_id"):
        op.add_column(
            "generated_contents",
            sa.Column("reviewed_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.create_foreign_key(
            "fk_generated_contents_reviewed_by_id",
            "generated_contents",
            "users",
            ["reviewed_by_id"],
            ["id"],
        )
    if not _has_column(bind, "generated_contents", "review_comment"):
        op.add_column(
            "generated_contents",
            sa.Column("review_comment", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    if _has_column(bind, "generated_contents", "review_comment"):
        op.drop_column("generated_contents", "review_comment")
    if _has_column(bind, "generated_contents", "reviewed_by_id"):
        op.drop_constraint("fk_generated_contents_reviewed_by_id", "generated_contents", type_="foreignkey")
        op.drop_column("generated_contents", "reviewed_by_id")
    if _has_column(bind, "generated_contents", "assigned_reviewer_id"):
        op.drop_constraint("fk_generated_contents_assigned_reviewer_id", "generated_contents", type_="foreignkey")
        op.drop_column("generated_contents", "assigned_reviewer_id")
