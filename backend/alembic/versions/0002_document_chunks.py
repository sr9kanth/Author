"""document chunks (RAG vector store)

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-07 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

# Embedding dimensionality must match settings.EMBEDDING_DIM (text-embedding-3-small).
EMBEDDING_DIM = 1536


def upgrade() -> None:
    # pgvector extension is created in 0001 / init_db, but ensure it exists so
    # this migration is safe to run standalone.
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "document_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "asset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge_assets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        # Nullable so chunks persist even when no embedding key is configured.
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=True),
        sa.Column("token_count", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_document_chunks_asset_id", "document_chunks", ["asset_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_document_chunks_asset_id", table_name="document_chunks")
    op.drop_table("document_chunks")
