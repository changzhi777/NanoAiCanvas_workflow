"""Add API Key and Image Task tables

Revision ID: 003
Revises: 002_add_categories_teams
Create Date: 2026-05-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers
revision = '003'
down_revision = '002_add_categories_teams'
branch_labels = None
depends_on = None


def upgrade():
    # API Key Config table
    op.create_table(
        'api_key_configs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('frontend_key', sa.String(length=64), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_api_key_configs_frontend_key', 'api_key_configs', ['frontend_key'], unique=True)

    # Backend Key Mapping table
    op.create_table(
        'backend_key_mappings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('frontend_key_id', sa.Integer(), nullable=False),
        sa.Column('backend_key', sa.String(length=128), nullable=False),
        sa.Column('provider_type', sa.String(length=32), nullable=False),
        sa.Column('model_type', sa.String(length=64), nullable=False),
        sa.Column('mcp_config', JSONB(), nullable=True),
        sa.Column('skills', JSONB(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=True, default=0),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['frontend_key_id'], ['api_key_configs.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_backend_key_mappings_model_type', 'backend_key_mappings', ['model_type'])
    op.create_index('idx_backend_key_model', 'backend_key_mappings', ['backend_key', 'model_type'])

    # Image Tasks table
    op.create_table(
        'image_tasks',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('task_id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('frontend_key', sa.String(length=64), nullable=True),
        sa.Column('model_type', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=True, default='pending'),
        sa.Column('request_params', JSONB(), nullable=True),
        sa.Column('result', JSONB(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('task_id')
    )
    op.create_index('ix_image_tasks_task_id', 'image_tasks', ['task_id'])
    op.create_index('ix_image_tasks_user_id', 'image_tasks', ['user_id'])
    op.create_index('idx_user_status', 'image_tasks', ['user_id', 'status'])


def downgrade():
    op.drop_index('idx_user_status', 'image_tasks')
    op.drop_index('ix_image_tasks_user_id', 'image_tasks')
    op.drop_index('ix_image_tasks_task_id', 'image_tasks')
    op.drop_table('image_tasks')

    op.drop_index('idx_backend_key_model', 'backend_key_mappings')
    op.drop_index('ix_backend_key_mappings_model_type', 'backend_key_mappings')
    op.drop_table('backend_key_mappings')

    op.drop_index('ix_api_key_configs_frontend_key', 'api_key_configs')
    op.drop_table('api_key_configs')