"""Add user role field

Revision ID: 006
Revises: 005
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('role', sa.String(20), nullable=False, server_default='user'))


def downgrade() -> None:
    op.drop_column('users', 'role')
