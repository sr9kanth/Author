"""generation_jobs.stimulus_id column

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-08 00:00:00.000000

Idempotent: guards the column addition so it can run on databases that
already have the column (e.g. fresh dev envs from model definition).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def _has_column(bind, table: str, column: str) -> bool:
    try:
        return any(c["name"] == column for c in sa.inspect(bind).get_columns(table))
    except Exception:
        return False


def upgrade() -> None:
    bind = op.get_bind()
    if not _has_column(bind, "generation_jobs", "stimulus_id"):
        op.add_column(
            "generation_jobs",
            sa.Column("stimulus_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.create_foreign_key(
            "fk_generation_jobs_stimulus_id",
            "generation_jobs",
            "stimuli",
            ["stimulus_id"],
            ["id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    if _has_column(bind, "generation_jobs", "stimulus_id"):
        op.drop_constraint("fk_generation_jobs_stimulus_id", "generation_jobs", type_="foreignkey")
        op.drop_column("generation_jobs", "stimulus_id")
