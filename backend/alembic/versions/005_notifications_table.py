"""create notifications table

Revision ID: 005
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    notification_type = ENUM(
        'system', 'approval', 'rejection', 'points_grant', 'points_deduct', 'team_invite',
        name='notificationtype',
        create_type=True,
    )
    op.create_table(
        'notifications',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('type', notification_type, nullable=False, index=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text, nullable=True),
        sa.Column('is_read', sa.Boolean, default=False, index=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('notifications')
    op.execute('DROP TYPE IF EXISTS notificationtype')
