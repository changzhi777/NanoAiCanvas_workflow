"""add image_descriptions table for M3 vision cache

Revision ID: 016_image_descriptions
Revises: 015_agent_system
"""
from alembic import op
import sqlalchemy as sa


revision = '016_image_descriptions'
down_revision = '015_agent_system'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'image_descriptions',
        sa.Column('image_hash', sa.String(64), primary_key=True),
        sa.Column('model', sa.String(64), primary_key=True),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('hit_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('last_hit_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_image_descriptions_last_hit', 'image_descriptions', ['last_hit_at'])


def downgrade():
    op.drop_index('ix_image_descriptions_last_hit', table_name='image_descriptions')
    op.drop_table('image_descriptions')
