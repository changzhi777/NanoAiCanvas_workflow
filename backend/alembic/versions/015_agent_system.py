"""add agent system tables

Revision ID: 015_agent_system
Revises: 014_tvc_projects
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = '015_agent_system'
down_revision = '014_tvc_projects'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'agent_sessions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='active', index=True),
        sa.Column('pipeline_type', sa.String(30), nullable=False, server_default='adaptation'),
        sa.Column('context_json', JSONB, server_default='{}'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        'agent_memories',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('layer', sa.Integer, nullable=False, index=True),
        sa.Column('category', sa.String(100), nullable=False, index=True),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('stability', sa.Float, nullable=False, server_default='1.0'),
        sa.Column('access_count', sa.Integer, server_default='0'),
        sa.Column('half_life_days', sa.Float, server_default='30.0'),
        sa.Column('last_accessed', sa.DateTime, server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Index('ix_agent_memories_layer_category', 'layer', 'category'),
    )

    op.create_table(
        'agent_tasks',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('session_id', UUID(as_uuid=True), sa.ForeignKey('agent_sessions.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('pipeline_type', sa.String(30), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='queued'),
        sa.Column('params_json', JSONB, server_default='{}'),
        sa.Column('result_json', JSONB, nullable=True),
        sa.Column('progress', sa.Float, server_default='0.0'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Index('ix_agent_tasks_status', 'status'),
    )

    op.create_table(
        'agent_execution_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('task_id', UUID(as_uuid=True), sa.ForeignKey('agent_tasks.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('agent_name', sa.String(50), nullable=False, index=True),
        sa.Column('stage', sa.String(50), nullable=False),
        sa.Column('input_tokens', sa.Integer, server_default='0'),
        sa.Column('output_tokens', sa.Integer, server_default='0'),
        sa.Column('duration_ms', sa.Integer, server_default='0'),
        sa.Column('success', sa.Boolean, server_default='true'),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('model_used', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Index('ix_execution_logs_agent_stage', 'agent_name', 'stage'),
        sa.Index('ix_execution_logs_created', 'created_at'),
    )

    op.create_table(
        'system_skills',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('version', sa.String(20), nullable=False),
        sa.Column('skill_md', sa.Text, nullable=False),
        sa.Column('config_json', JSONB, server_default='{}'),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft', index=True),
        sa.Column('stability', sa.Float, server_default='1.0'),
        sa.Column('usage_count', sa.Integer, server_default='0'),
        sa.Column('success_rate', sa.Float, server_default='0.0'),
        sa.Column('avg_duration_ms', sa.Integer, server_default='0'),
        sa.Column('source_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        'user_skills',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('system_skill_id', UUID(as_uuid=True), sa.ForeignKey('system_skills.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(100), nullable=False, index=True),
        sa.Column('version', sa.String(20), nullable=False),
        sa.Column('skill_md', sa.Text, nullable=False),
        sa.Column('config_json', JSONB, server_default='{}'),
        sa.Column('status', sa.String(20), nullable=False, server_default='personal', index=True),
        sa.Column('fork_version', sa.String(20), nullable=True),
        sa.Column('stability', sa.Float, server_default='1.0'),
        sa.Column('usage_count', sa.Integer, server_default='0'),
        sa.Column('success_rate', sa.Float, server_default='0.0'),
        sa.Column('avg_duration_ms', sa.Integer, server_default='0'),
        sa.Column('divergence', sa.Float, server_default='0.0'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
        sa.Index('ix_user_skills_user_name', 'user_id', 'name'),
    )

    op.create_table(
        'skill_promotion_requests',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_skill_id', UUID(as_uuid=True), sa.ForeignKey('user_skills.id', ondelete='CASCADE'), nullable=False),
        sa.Column('system_skill_id', UUID(as_uuid=True), sa.ForeignKey('system_skills.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending', index=True),
        sa.Column('diff_summary', sa.Text, nullable=True),
        sa.Column('test_results_json', JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('reviewed_at', sa.DateTime, nullable=True),
    )


def downgrade():
    op.drop_table('skill_promotion_requests')
    op.drop_table('user_skills')
    op.drop_table('system_skills')
    op.drop_table('agent_execution_logs')
    op.drop_table('agent_tasks')
    op.drop_table('agent_memories')
    op.drop_table('agent_sessions')
