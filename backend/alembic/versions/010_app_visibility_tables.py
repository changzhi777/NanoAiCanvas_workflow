"""create app_visibility_items and visibility_audit_logs tables

Revision ID: 010
Revises: 009
Create Date: 2026-05-10
"""
from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "app_visibility_items",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("scope", sa.String(50), nullable=False, index=True),
        sa.Column("item_id", sa.String(100), nullable=False),
        sa.Column("item_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("description", sa.String(500), nullable=False, server_default=""),
        sa.Column("category", sa.String(100), nullable=False, server_default=""),
        sa.Column("visibility", sa.String(20), nullable=False, server_default="disabled"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("scope", "item_id", name="ix_av_scope_item"),
    )

    op.create_table(
        "visibility_audit_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("admin_id", sa.String(100), nullable=True),
        sa.Column("admin_name", sa.String(100), nullable=True),
        sa.Column("scope", sa.String(50), nullable=False, index=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("changes", sa.JSON(), nullable=True),
        sa.Column("snapshot", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("visibility_audit_logs")
    op.drop_table("app_visibility_items")
