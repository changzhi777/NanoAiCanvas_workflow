"""initial migration

Revision ID: 001
Revises:
Create Date: 2026-05-01

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('username', sa.String(50), unique=True, nullable=False),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_verified', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('last_login_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_users_username', 'users', ['username'])
    op.create_index('ix_users_email', 'users', ['email'])

    # Create assets table
    op.create_table(
        'assets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('url', sa.Text, nullable=False),
        sa.Column('thumbnail_url', sa.Text, nullable=True),
        sa.Column('metadata', postgresql.JSONB, default=dict),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String), default=list),
        sa.Column('workflow_snapshot', postgresql.JSONB, nullable=True),
        sa.Column('is_starred', sa.Boolean, default=False),
        sa.Column('is_deleted', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_assets_user_id', 'assets', ['user_id'])
    op.create_index('ix_assets_type', 'assets', ['type'])
    op.create_index('ix_assets_category', 'assets', ['category'])

    # Create workflows table
    op.create_table(
        'workflows',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('data', postgresql.JSONB, default=dict),
        sa.Column('version', sa.Integer, default=1),
        sa.Column('cover_asset_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_deleted', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_workflows_user_id', 'workflows', ['user_id'])
    op.create_index('ix_workflows_updated_at', 'workflows', ['user_id', 'updated_at'])

    # Create workflow_versions table
    op.create_table(
        'workflow_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workflow_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workflows.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version', sa.Integer, nullable=False),
        sa.Column('data', postgresql.JSONB, nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_workflow_versions_workflow_id', 'workflow_versions', ['workflow_id'])

    # Create operations table
    op.create_table(
        'operations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workflow_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workflows.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('device_id', sa.String(100), nullable=False),
        sa.Column('op_type', sa.String(20), nullable=False),
        sa.Column('entity_type', sa.String(20), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('payload', postgresql.JSONB, nullable=False),
        sa.Column('timestamp', sa.DateTime, server_default=sa.func.now()),
        sa.Column('synced', sa.Boolean, default=False),
    )
    op.create_index('ix_operations_workflow_id', 'operations', ['workflow_id'])
    op.create_index('ix_operations_user_id', 'operations', ['user_id'])
    op.create_index('ix_operations_device_id', 'operations', ['device_id'])
    op.create_index('ix_operations_timestamp', 'operations', ['timestamp'])
    op.create_index('ix_operations_synced', 'operations', ['synced'])

    # Create templates table
    op.create_table(
        'templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('thumbnail', sa.Text, nullable=True),
        sa.Column('data', postgresql.JSONB, nullable=False),
        sa.Column('tags', postgresql.ARRAY(sa.String), default=list),
        sa.Column('is_public', sa.Boolean, default=False),
        sa.Column('is_deleted', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_templates_user_id', 'templates', ['user_id'])
    op.create_index('ix_templates_category', 'templates', ['category'])


def downgrade() -> None:
    op.drop_table('templates')
    op.drop_table('operations')
    op.drop_table('workflow_versions')
    op.drop_table('workflows')
    op.drop_table('assets')
    op.drop_table('users')