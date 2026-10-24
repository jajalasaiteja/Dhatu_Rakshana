"""Add structured evaluation measurements and evaluation history.

Revision ID: 7c3d2e1a9b5f
Revises: 5a9e2f180bc4
Create Date: 2026-10-23 12:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '7c3d2e1a9b5f'
down_revision: Union[str, None] = '5a9e2f180bc4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Add versioning & recalculation columns to inspections table
    with op.batch_alter_table('inspections') as batch_op:
        batch_op.add_column(sa.Column('evaluation_engine_version', sa.String(length=50), nullable=True, server_default='2.0.0-iso-aligned'))
        batch_op.add_column(sa.Column('recalculated_at', sa.DateTime(), nullable=True))

    # 2. Create inspection_measurements table
    op.create_table(
        'inspection_measurements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('inspection_id', sa.Integer(), nullable=False),
        sa.Column('image_id', sa.Integer(), nullable=True),
        sa.Column('measurement_key', sa.String(length=100), nullable=False),
        sa.Column('measurement_name', sa.String(length=150), nullable=False),
        sa.Column('measurement_category', sa.String(length=100), nullable=False),
        sa.Column('measured_value', sa.String(length=255), nullable=True),
        sa.Column('numeric_value', sa.Float(), nullable=True),
        sa.Column('unit', sa.String(length=50), nullable=True),
        sa.Column('applicable_standard', sa.String(length=150), nullable=True),
        sa.Column('standard_edition', sa.String(length=100), nullable=True),
        sa.Column('rating_or_criterion', sa.String(length=255), nullable=True),
        sa.Column('assessment_status', sa.String(length=50), nullable=False, server_default='Measured'),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('measurement_method', sa.String(length=255), nullable=True),
        sa.Column('evidence_source', sa.String(length=255), nullable=True),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('evaluation_engine_version', sa.String(length=50), nullable=False, server_default='2.0.0-iso-aligned'),
        sa.Column('evaluation_timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['inspection_id'], ['inspections.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['image_id'], ['inspection_images.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_inspection_measurements_inspection_id', 'inspection_measurements', ['inspection_id'], unique=False)
    op.create_index('ix_inspection_measurements_image_id', 'inspection_measurements', ['image_id'], unique=False)
    op.create_index('ix_inspection_measurements_measurement_key', 'inspection_measurements', ['measurement_key'], unique=False)
    op.create_index('ix_inspection_measurements_measurement_name', 'inspection_measurements', ['measurement_name'], unique=False)
    op.create_index('ix_inspection_measurements_measurement_category', 'inspection_measurements', ['measurement_category'], unique=False)
    op.create_index('ix_inspection_measurements_assessment_status', 'inspection_measurements', ['assessment_status'], unique=False)

    # 3. Create evaluation_histories table for audit preservation of previous evaluations
    op.create_table(
        'evaluation_histories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('inspection_id', sa.Integer(), nullable=False),
        sa.Column('evaluation_engine_version', sa.String(length=50), nullable=False),
        sa.Column('overall_verdict', sa.String(length=50), nullable=False),
        sa.Column('defect_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('snapshot_data', sa.Text(), nullable=False),
        sa.Column('evaluated_at', sa.DateTime(), nullable=False),
        sa.Column('archived_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['inspection_id'], ['inspections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_evaluation_histories_inspection_id', 'evaluation_histories', ['inspection_id'], unique=False)

def downgrade() -> None:
    op.drop_index('ix_evaluation_histories_inspection_id', table_name='evaluation_histories')
    op.drop_table('evaluation_histories')

    op.drop_index('ix_inspection_measurements_assessment_status', table_name='inspection_measurements')
    op.drop_index('ix_inspection_measurements_measurement_category', table_name='inspection_measurements')
    op.drop_index('ix_inspection_measurements_measurement_name', table_name='inspection_measurements')
    op.drop_index('ix_inspection_measurements_measurement_key', table_name='inspection_measurements')
    op.drop_index('ix_inspection_measurements_image_id', table_name='inspection_measurements')
    op.drop_index('ix_inspection_measurements_inspection_id', table_name='inspection_measurements')
    op.drop_table('inspection_measurements')

    with op.batch_alter_table('inspections') as batch_op:
        batch_op.drop_column('recalculated_at')
        batch_op.drop_column('evaluation_engine_version')
