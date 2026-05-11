"""add health fields to api_keys

Revision ID: 011
Revises: 010
"""
from alembic import op
import sqlalchemy as sa

revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('api_keys', sa.Column('last_heartbeat_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('api_keys', sa.Column('health_status', sa.String(16), server_default='unknown', nullable=True))
    op.add_column('api_keys', sa.Column('last_response_ms', sa.Integer(), nullable=True))
    op.add_column('api_keys', sa.Column('last_error', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('api_keys', 'last_error')
    op.drop_column('api_keys', 'last_response_ms')
    op.drop_column('api_keys', 'health_status')
    op.drop_column('api_keys', 'last_heartbeat_at')
