"""generation_task_logs table

Revision ID: 008_generation_log
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM

revision = '008_generation_log'
down_revision = '007_user_avatar'
branch_labels = None
depends_on = None


def upgrade() -> None:
    status_enum = ENUM('success', 'failed', 'aborted', name='generationstatus', create_type=True)
    op.create_table(
        'generation_task_logs',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('user_id', UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('node_id', sa.String(64), nullable=True, index=True),
        sa.Column('workflow_id', UUID(as_uuid=True), nullable=True),
        sa.Column('skill_id', sa.String(64), nullable=True, index=True),
        sa.Column('prompt', sa.Text, nullable=True),
        sa.Column('status', status_enum, nullable=False, index=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('total_time_ms', sa.Integer, nullable=True),
        sa.Column('step_durations', JSONB, nullable=True),
        sa.Column('model_params', JSONB, nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
    )


def downgrade() -> None:
    op.drop_table('generation_task_logs')
    op.execute('DROP TYPE IF EXISTS generationstatus')
