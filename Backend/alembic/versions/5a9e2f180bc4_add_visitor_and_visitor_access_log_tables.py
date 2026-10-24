"""Add visitor and visitor_access_log tables.

Revision ID: 5a9e2f180bc4
Revises: 41a8e9d301f2
Create Date: 2026-10-22 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '5a9e2f180bc4'
down_revision: Union[str, None] = '41a8e9d301f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create visitors table for visitor identity registry
    op.create_table(
        'visitors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('organization', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_visitors_username', 'visitors', ['username'], unique=True)
    op.create_index('ix_visitors_is_active', 'visitors', ['is_active'], unique=False)

    # 2. Create visitor_access_logs table for recording visitor audit events
    op.create_table(
        'visitor_access_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('visitor_username', sa.String(length=100), nullable=False),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('event_type', sa.String(length=50), nullable=False, server_default='SUCCESSFUL_ACCESS'),
        sa.Column('accessed_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_visitor_access_logs_visitor_username', 'visitor_access_logs', ['visitor_username'], unique=False)
    op.create_index('ix_visitor_access_logs_session_id', 'visitor_access_logs', ['session_id'], unique=False)
    op.create_index('ix_visitor_access_logs_accessed_at', 'visitor_access_logs', ['accessed_at'], unique=False)

def downgrade() -> None:
    op.drop_index('ix_visitor_access_logs_accessed_at', table_name='visitor_access_logs')
    op.drop_index('ix_visitor_access_logs_session_id', table_name='visitor_access_logs')
    op.drop_index('ix_visitor_access_logs_visitor_username', table_name='visitor_access_logs')
    op.drop_table('visitor_access_logs')

    op.drop_index('ix_visitors_is_active', table_name='visitors')
    op.drop_index('ix_visitors_username', table_name='visitors')
    op.drop_table('visitors')
