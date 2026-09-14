"""Add user avatar_url field

Revision ID: 007
Revises: 006
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('avatar_url', sa.String(1024), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'avatar_url')
