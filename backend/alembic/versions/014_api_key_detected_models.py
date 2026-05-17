"""add detected_models to api_keys

Revision ID: 014_api_key_detected_models
Revises: 013_tvc_workflow_configs
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = '014_api_key_detected_models'
down_revision = '013_tvc_workflow_configs'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'api_keys',
        sa.Column('detected_models', JSONB, nullable=True, server_default='[]'),
    )
    op.add_column(
        'api_keys',
        sa.Column('last_scan_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_column('api_keys', 'detected_models')
    op.drop_column('api_keys', 'last_scan_at')
