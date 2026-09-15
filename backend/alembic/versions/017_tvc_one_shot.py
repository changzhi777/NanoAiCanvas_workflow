"""add tvc_one_shot_templates + tvc_one_shot_logs

Revision ID: 017_tvc_one_shot
Revises: 016_image_descriptions
"""
from alembic import op
import sqlalchemy as sa
import uuid


revision = '017_tvc_one_shot'
down_revision = '016_image_descriptions'
branch_labels = None
depends_on = None


def upgrade():
    # 1. tvc_one_shot_templates（4 构图 × 3 叙事 = 12 行种子）
    op.create_table(
        'tvc_one_shot_templates',
        sa.Column('id', sa.UUID, primary_key=True, default=uuid.uuid4),
        sa.Column('narrative', sa.String(20), nullable=False),
        sa.Column('composition', sa.String(30), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('prompt_template', sa.Text, nullable=False),
        sa.Column('recommended_duration', sa.Integer, nullable=False, server_default='15'),
        sa.Column('motion_chain', sa.String(50), nullable=True),
        sa.Column('bpm_hint', sa.Integer, nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('narrative', 'composition', name='ix_one_shot_unique'),
    )

    # 2. tvc_one_shot_logs（A/B 埋点）
    op.create_table(
        'tvc_one_shot_logs',
        sa.Column('id', sa.UUID, primary_key=True, default=uuid.uuid4),
        sa.Column('template_id', sa.UUID, nullable=True),
        sa.Column('task_id', sa.String(64), nullable=False),
        sa.Column('user_id', sa.UUID, nullable=False),
        sa.Column('narrative', sa.String(20), nullable=False),
        sa.Column('composition', sa.String(30), nullable=False),
        sa.Column('action', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['template_id'], ['tvc_one_shot_templates.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_one_shot_logs_task_id', 'tvc_one_shot_logs', ['task_id'])
    op.create_index('ix_one_shot_logs_user_id', 'tvc_one_shot_logs', ['user_id'])
    op.create_index('ix_one_shot_logs_created_at', 'tvc_one_shot_logs', ['created_at'])

    # 3. 灌入 12 行默认模板
    import json
    from app.models.tvc_one_shot import DEFAULT_TEMPLATES

    bind = op.get_bind()
    insert_rows = []
    for t in DEFAULT_TEMPLATES:
        insert_rows.append({
            'id': str(uuid.uuid4()),
            'narrative': t['narrative'],
            'composition': t['composition'],
            'name': t['name'],
            'prompt_template': t['prompt_template'],
            'recommended_duration': t['recommended_duration'],
            'motion_chain': t['motion_chain'],
            'bpm_hint': t['bpm_hint'],
        })
    op.bulk_insert(
        sa.table(
            'tvc_one_shot_templates',
            sa.column('id', sa.UUID),
            sa.column('narrative', sa.String),
            sa.column('composition', sa.String),
            sa.column('name', sa.String),
            sa.column('prompt_template', sa.Text),
            sa.column('recommended_duration', sa.Integer),
            sa.column('motion_chain', sa.String),
            sa.column('bpm_hint', sa.Integer),
        ),
        insert_rows,
    )


def downgrade():
    op.drop_index('ix_one_shot_logs_created_at', table_name='tvc_one_shot_logs')
    op.drop_index('ix_one_shot_logs_user_id', table_name='tvc_one_shot_logs')
    op.drop_index('ix_one_shot_logs_task_id', table_name='tvc_one_shot_logs')
    op.drop_table('tvc_one_shot_logs')
    op.drop_table('tvc_one_shot_templates')
