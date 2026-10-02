"""Initial production schema migration for Dhatu Rakshana naval coating inspection platform.

Revision ID: 302c5b740cd6
Revises: 
Create Date: 2026-10-02 16:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

revision: str = '302c5b740cd6'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='inspector'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. zones
    op.create_table(
        'zones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('asset_description', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_zones_name'), 'zones', ['name'], unique=False)

    # 3. model_versions
    op.create_table(
        'model_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=False),
        sa.Column('framework', sa.String(length=50), nullable=False),
        sa.Column('model_type', sa.String(length=50), nullable=False),
        sa.Column('artifact_path', sa.String(length=500), nullable=True),
        sa.Column('checksum_sha256', sa.String(length=64), nullable=True),
        sa.Column('confidence_threshold', sa.Float(), nullable=False, server_default='0.45'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_model_versions_name'), 'model_versions', ['name'], unique=False)

    # 4. inspections
    op.create_table(
        'inspections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('zone_id', sa.Integer(), nullable=False),
        sa.Column('inspector_id', sa.Integer(), nullable=True),
        sa.Column('model_version_id', sa.Integer(), nullable=True),
        sa.Column('image_path', sa.String(length=1000), nullable=False, server_default=''),
        sa.Column('mesh_path', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='COMPLETED'),
        sa.Column('overall_verdict', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('preprocessing_version', sa.String(length=50), nullable=False, server_default='1.0.0'),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['zone_id'], ['zones.id'], ),
        sa.ForeignKeyConstraint(['inspector_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['model_version_id'], ['model_versions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inspections_zone_id'), 'inspections', ['zone_id'], unique=False)
    op.create_index(op.f('ix_inspections_timestamp'), 'inspections', ['timestamp'], unique=False)
    op.create_index(op.f('ix_inspections_status'), 'inspections', ['status'], unique=False)

    # 5. inspection_images
    op.create_table(
        'inspection_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('inspection_id', sa.Integer(), nullable=False),
        sa.Column('storage_key', sa.String(length=500), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('width', sa.Integer(), nullable=False, server_default='640'),
        sa.Column('height', sa.Integer(), nullable=False, server_default='640'),
        sa.Column('checksum_sha256', sa.String(length=64), nullable=True),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['inspection_id'], ['inspections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inspection_images_inspection_id'), 'inspection_images', ['inspection_id'], unique=False)

    # 6. detections
    op.create_table(
        'detections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('inspection_id', sa.Integer(), nullable=False),
        sa.Column('image_id', sa.Integer(), nullable=True),
        sa.Column('class', sa.String(length=50), nullable=False),
        sa.Column('subtype', sa.String(length=50), nullable=False),
        sa.Column('bbox', sa.Text(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('area_pct', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('severity', sa.String(length=50), nullable=True, server_default='Medium'),
        sa.ForeignKeyConstraint(['inspection_id'], ['inspections.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['image_id'], ['inspection_images.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_detections_inspection_id'), 'detections', ['inspection_id'], unique=False)
    op.create_index(op.f('ix_detections_subtype'), 'detections', ['subtype'], unique=False)

    # 7. defect_measurements
    op.create_table(
        'defect_measurements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('detection_id', sa.Integer(), nullable=False),
        sa.Column('bbox_width', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('bbox_height', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('aspect_ratio', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('pixel_area', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('area_pct', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('centroid_x', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('centroid_y', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('surface_depth_proxy', sa.Float(), nullable=True),
        sa.Column('roughness_index', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['detection_id'], ['detections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('detection_id')
    )

    # 8. graded_defect_records
    op.create_table(
        'graded_defect_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('detection_id', sa.Integer(), nullable=False),
        sa.Column('standard_reference', sa.String(length=200), nullable=False),
        sa.Column('rule_version', sa.String(length=50), nullable=False, server_default='2.1.0'),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('pass_fail', sa.String(length=50), nullable=False),
        sa.Column('notes', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['detection_id'], ['detections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_graded_defect_records_detection_id'), 'graded_defect_records', ['detection_id'], unique=False)

    # 9. processing_jobs
    op.create_table(
        'processing_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.String(length=64), nullable=False),
        sa.Column('inspection_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('progress_pct', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('current_stage', sa.String(length=50), nullable=False, server_default='QUEUED'),
        sa.Column('error_code', sa.String(length=100), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['inspection_id'], ['inspections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_processing_jobs_job_id'), 'processing_jobs', ['job_id'], unique=True)
    op.create_index(op.f('ix_processing_jobs_inspection_id'), 'processing_jobs', ['inspection_id'], unique=False)

    # 10. processing_artifacts
    op.create_table(
        'processing_artifacts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('inspection_id', sa.Integer(), nullable=False),
        sa.Column('artifact_type', sa.String(length=50), nullable=False),
        sa.Column('storage_key', sa.String(length=500), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False, server_default='application/octet-stream'),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('checksum_sha256', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['inspection_id'], ['inspections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_processing_artifacts_inspection_id'), 'processing_artifacts', ['inspection_id'], unique=False)

    # 11. inspection_reports
    op.create_table(
        'inspection_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('inspection_id', sa.Integer(), nullable=False),
        sa.Column('report_title', sa.String(length=255), nullable=False),
        sa.Column('storage_key', sa.String(length=500), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('checksum_sha256', sa.String(length=64), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['inspection_id'], ['inspections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inspection_reports_inspection_id'), 'inspection_reports', ['inspection_id'], unique=False)

def downgrade() -> None:
    op.drop_table('inspection_reports')
    op.drop_table('processing_artifacts')
    op.drop_table('processing_jobs')
    op.drop_table('graded_defect_records')
    op.drop_table('defect_measurements')
    op.drop_table('detections')
    op.drop_table('inspection_images')
    op.drop_table('inspections')
    op.drop_table('model_versions')
    op.drop_table('zones')
    op.drop_table('users')
