"""add asset version column

Revision ID: 009
"""
from alembic import op
import sqlalchemy as sa

revision = '009'
down_revision = '008_generation_log'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('assets', sa.Column('version', sa.String(10), nullable=True))


def downgrade() -> None:
    op.drop_column('assets', 'version')
