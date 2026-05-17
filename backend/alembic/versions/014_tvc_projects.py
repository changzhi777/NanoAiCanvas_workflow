"""add tvc_projects and tvc_project_shots tables

Revision ID: 014_tvc_projects
Revises: 013_tvc_workflow_configs
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = '014_tvc_projects'
down_revision = '014_api_key_detected_models'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'tvc_projects',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('team_id', sa.Integer, sa.ForeignKey('teams.id'), nullable=True, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('original_text', sa.Text, nullable=False, server_default=''),
        sa.Column('script', JSONB, nullable=True),
        sa.Column('composed_video_url', sa.Text, nullable=True),
        sa.Column('bgm_url', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft', index=True),
        sa.Column('task_id', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        'tvc_project_shots',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', UUID(as_uuid=True), sa.ForeignKey('tvc_projects.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('shot_index', sa.Integer, nullable=False),
        sa.Column('scene_number', sa.Integer, nullable=True),
        sa.Column('scene_description', sa.Text, nullable=True),
        sa.Column('video_prompt', sa.Text, nullable=True),
        sa.Column('start_frame_prompt', sa.Text, nullable=True),
        sa.Column('end_frame_prompt', sa.Text, nullable=True),
        sa.Column('bgm_mood', sa.String(50), nullable=True),
        sa.Column('image_url', sa.Text, nullable=True),
        sa.Column('video_url', sa.Text, nullable=True),
        sa.Column('duration', sa.Float, nullable=True, server_default='5.0'),
        sa.Column('image_asset_id', UUID(as_uuid=True), nullable=True),
        sa.Column('video_asset_id', UUID(as_uuid=True), nullable=True),
        sa.Column('dialogue', JSONB, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('tvc_project_shots')
    op.drop_table('tvc_projects')
