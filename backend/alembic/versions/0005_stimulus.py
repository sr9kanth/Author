"""stimuli table + generated_contents.stimulus_id

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-07 00:00:00.000000

Idempotent: the Stimulus feature shipped its model without a migration, so on
databases created before this migration the `stimuli` table and the
`generated_contents.stimulus_id` column may be missing (create_missing_tables
only adds whole tables, never columns). Guard each change with a catalog check
so this runs cleanly whether or not the objects already exist.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def _has_table(bind, name: str) -> bool:
    return sa.inspect(bind).has_table(name)


def _has_column(bind, table: str, column: str) -> bool:
    if not _has_table(bind, table):
        return False
    return any(c["name"] == column for c in sa.inspect(bind).get_columns(table))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "stimuli"):
        op.create_table(
            "stimuli",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("title", sa.String(500), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("stimulus_type", sa.String(100), nullable=False, server_default="scenario"),
            sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )

    if not _has_column(bind, "generated_contents", "stimulus_id"):
        op.add_column(
            "generated_contents",
            sa.Column("stimulus_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.create_foreign_key(
            "fk_generated_contents_stimulus_id",
            "generated_contents",
            "stimuli",
            ["stimulus_id"],
            ["id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    if _has_column(bind, "generated_contents", "stimulus_id"):
        op.drop_constraint("fk_generated_contents_stimulus_id", "generated_contents", type_="foreignkey")
        op.drop_column("generated_contents", "stimulus_id")
    if _has_table(bind, "stimuli"):
        op.drop_table("stimuli")
