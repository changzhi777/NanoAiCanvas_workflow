"""add categories, teams, and team_assets

Revision ID: 002
Revises: 001
Create Date: 2026-05-05

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create categories table first
    op.create_table(
        'categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('color', sa.String(7), nullable=True),
        sa.Column('is_system', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_categories_user_id', 'categories', ['user_id'])
    op.create_index('ix_categories_team_id', 'categories', ['team_id'])
    op.create_unique_constraint('uq_user_category', 'categories', ['user_id', 'name'])
    op.create_unique_constraint('uq_team_category', 'categories', ['team_id', 'name'])

    # Add category_id to assets table (after categories table exists)
    op.add_column('assets', sa.Column('category_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_assets_category_id', 'assets', ['category_id'])

    # Create teams table (replacing old Integer-based teams)
    op.create_table(
        'teams',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('admin_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_teams_owner_id', 'teams', ['owner_id'])
    op.create_index('ix_teams_admin_id', 'teams', ['admin_id'])

    # Create team_members table
    op.create_table(
        'team_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(32), default='member'),
        sa.Column('can_edit', sa.Boolean, default=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_team_members_team_id', 'team_members', ['team_id'])
    op.create_index('ix_team_members_user_id', 'team_members', ['user_id'])
    op.create_unique_constraint('uq_team_member', 'team_members', ['team_id', 'user_id'])

    # Create team_assets table
    op.create_table(
        'team_assets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('asset_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('added_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_team_assets_team_id', 'team_assets', ['team_id'])
    op.create_index('ix_team_assets_asset_id', 'team_assets', ['asset_id'])
    op.create_unique_constraint('uq_team_asset', 'team_assets', ['team_id', 'asset_id'])


def downgrade() -> None:
    op.drop_table('team_assets')
    op.drop_table('team_members')
    op.drop_table('teams')
    op.drop_table('categories')
    op.drop_index('ix_assets_category_id', 'assets')
    op.drop_column('assets', 'category_id')