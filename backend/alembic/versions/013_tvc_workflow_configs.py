"""add tvc_workflow_configs table

Revision ID: 013_tvc_workflow_configs
Revises: 012_asset_type_category_simplify
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = '013_tvc_workflow_configs'
down_revision = '012_asset_type_category_simplify'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'tvc_workflow_configs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('scope', sa.String(20), nullable=False, index=True),
        sa.Column('user_id', UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('name', sa.String(100), nullable=False, server_default='default'),
        sa.Column('step1_script', JSONB, nullable=True),
        sa.Column('step2_optimize', JSONB, nullable=True),
        sa.Column('step3_breakdown', JSONB, nullable=True),
        sa.Column('step4_image', JSONB, nullable=True),
        sa.Column('step5_video', JSONB, nullable=True),
        sa.Column('step5_bgm', JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('tvc_workflow_configs')
