"""Add topology_files table and user username/is_active fields.

Revision ID: 41a8e9d301f2
Revises: 302c5b740cd6
Create Date: 2026-10-02 21:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

revision: str = '41a8e9d301f2'
down_revision: Union[str, None] = '302c5b740cd6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Update users table with batch_alter_table for SQLite compatibility
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('username', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'))
        batch_op.create_index('ix_users_username', ['username'], unique=True)

    # 2. Create topology_files table
    op.create_table(
        'topology_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('inspection_id', sa.Integer(), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False, server_default='topology.ply'),
        sa.Column('stored_filename', sa.String(length=255), nullable=False, server_default='topology.ply'),
        sa.Column('storage_path', sa.String(length=500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('file_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['inspection_id'], ['inspections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_topology_files_inspection_id', 'topology_files', ['inspection_id'], unique=True)
    op.create_index('ix_topology_files_file_hash', 'topology_files', ['file_hash'], unique=False)

def downgrade() -> None:
    op.drop_index('ix_topology_files_file_hash', table_name='topology_files')
    op.drop_index('ix_topology_files_inspection_id', table_name='topology_files')
    op.drop_table('topology_files')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index('ix_users_username')
        batch_op.drop_column('is_active')
        batch_op.drop_column('username')
