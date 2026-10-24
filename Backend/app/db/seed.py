"""Database seeding utility to initialize naval platform zones, default inspector, and ML model records."""

from sqlmodel import Session, select
import logging

from app.core.timezone import get_ist_now

from app.db.session import engine, init_db
from app.models.zone import Zone
from app.models.user import User
from app.models.model_version import ModelVersion
from app.models.visitor import Visitor
from app.core.security import hash_password

logger = logging.getLogger("dhatu_rakshana.seed")

DEFAULT_VISITORS = [
    {
        "username": "visitor",
        "full_name": "Defense Platform Observer",
        "organization": "Naval Technical Review Board",
        "is_active": True
    },
    {
        "username": "auditor",
        "full_name": "Lead Coating Standards Auditor",
        "organization": "Maritime Coating Standards Authority",
        "is_active": True
    },
    {
        "username": "defense_observer",
        "full_name": "Defense Procurement Observer",
        "organization": "Directorate of Naval Hull Maintenance",
        "is_active": True
    },
    {
        "username": "naval_cadet",
        "full_name": "Trainee Naval Cadet",
        "organization": "Naval Engineering Academy",
        "is_active": True
    },
    {
        "username": "guest_evaluator",
        "full_name": "Guest Technical Specialist",
        "organization": "Corrosion Science Research Lab",
        "is_active": True
    }
]

DEFAULT_ZONES = [
    {
        "name": "Hull section 4",
        "asset_description": "Waterline anti-fouling primer & barrier coating subject to splash-zone cavitation"
    },
    {
        "name": "Deck plate 2",
        "asset_description": "Heavy-duty non-skid marine topcoat exposed to high-impact wheel load & salt spray"
    },
    {
        "name": "Ballast tank 1",
        "asset_description": "Confined compartment epoxy barrier protecting steel against corrosive salt ballast"
    },
    {
        "name": "Superstructure 1",
        "asset_description": "High-shear superstructure hydrodynamic flow surface with polyurethane finish"
    },
    {
        "name": "Keel Plate Alpha",
        "asset_description": "Bottom-most structural plate subject to benthic abrasion and cathodic protection monitoring"
    }
]

DEFAULT_MODELS = [
    {
        "name": "marine_hybrid_v1",
        "version": "1.5.0",
        "framework": "hybrid",
        "model_type": "yolo_plus_opencv_refinement",
        "confidence_threshold": 0.45,
        "is_active": True
    },
    {
        "name": "marine_classical_cv",
        "version": "1.2.0",
        "framework": "opencv",
        "model_type": "classical_cv",
        "confidence_threshold": 0.50,
        "is_active": True
    },
    {
        "name": "marine_yolo_v8",
        "version": "1.0.0",
        "framework": "ultralytics",
        "model_type": "yolov8",
        "confidence_threshold": 0.45,
        "is_active": True
    }
]

def seed_database():
    """Initializes tables and seeds platform zones, default inspector, and active models."""
    init_db()
    with Session(engine) as session:
        # 1. Seed Zones
        existing_zones = session.exec(select(Zone)).all()
        if not existing_zones:
            for z in DEFAULT_ZONES:
                session.add(Zone(name=z["name"], asset_description=z["asset_description"]))
            session.commit()
            logger.info(f"Seeded {len(DEFAULT_ZONES)} naval platform zones.")
        else:
            logger.info(f"Zones already present ({len(existing_zones)} zones found).")

        # 2. Seed Default Certified Inspector
        default_email = "inspector@navy.mil"
        existing_user = session.exec(select(User).where(User.email == default_email)).first()
        if not existing_user:
            default_inspector = User(
                username="inspector",
                email=default_email,
                password_hash=hash_password("password123"),
                full_name="Chief Inspector Sharma",
                role="inspector",
                is_active=True,
                created_at=get_ist_now()
            )
            session.add(default_inspector)
            session.commit()
            logger.info(f"Seeded default certified inspector: {default_email} (password: password123)")
        else:
            if not existing_user.username:
                existing_user.username = "inspector"
            existing_user.is_active = True
            session.add(existing_user)
            session.commit()
            logger.info(f"Default inspector already exists: {default_email}")

        # 3. Seed Model Versions
        existing_models = session.exec(select(ModelVersion)).all()
        if not existing_models:
            for m in DEFAULT_MODELS:
                session.add(ModelVersion(**m))
            session.commit()
            logger.info(f"Seeded {len(DEFAULT_MODELS)} AI model registry records.")
        else:
            logger.info(f"Model versions already present ({len(existing_models)} models found).")

        # 4. Seed Authorized Visitor Identities
        existing_visitors = session.exec(select(Visitor)).all()
        if not existing_visitors:
            for v in DEFAULT_VISITORS:
                session.add(Visitor(
                    username=v["username"],
                    full_name=v["full_name"],
                    organization=v["organization"],
                    is_active=v["is_active"],
                    created_at=get_ist_now()
                ))
            session.commit()
            logger.info(f"Seeded {len(DEFAULT_VISITORS)} authorized visitor identities.")
        else:
            logger.info(f"Visitor identities already present ({len(existing_visitors)} visitors found).")

        # 5. Purge Confirmed Obsolete Historical Record 9 if Present
        purge_obsolete_record_9(session)

def purge_obsolete_record_9(session: Session) -> bool:
    """Safely purges obsolete historical Record 9 if present in the active database.
    
    Preserves referential integrity, dependent cascading records, and valid inspection data.
    """
    from app.models.inspection import Inspection
    from app.models.detection import Detection
    from app.models.measurement import DefectMeasurement
    from app.models.grading import GradedDefectRecord
    from app.models.evaluation import InspectionMeasurement, EvaluationHistory
    from app.models.artifact import ProcessingArtifact
    from app.models.job import ProcessingJob
    from app.models.report import InspectionReport
    from app.models.inspection_image import InspectionImage
    from app.models.topology import TopologyFile
    from app.storage.local import storage
    from app.storage.topology_storage import topology_storage
    from sqlmodel import func, text

    stale_insp = session.get(Inspection, 9)
    if not stale_insp:
        return False

    # Check whether this is confirmed obsolete historical record 9
    img_path = (stale_insp.image_path or "").lower()
    is_obsolete = False
    if "48aec7c704_marine_scan_001_pinhole" in img_path or "/2026/10/02/" in img_path or "/2026/10/03/" in img_path:
        is_obsolete = True
    elif stale_insp.created_at and str(stale_insp.created_at).startswith("2026-10-02"):
        is_obsolete = True
    elif stale_insp.timestamp and str(stale_insp.timestamp).startswith("2026-10-02"):
        is_obsolete = True

    if not is_obsolete:
        logger.info("Inspection #9 is not an obsolete historical scan; preserving record.")
        return False

    logger.warning("Purging confirmed obsolete historical inspection Record #9 from database...")

    # 1. Collect storage file keys
    file_keys = []
    if stale_insp.images:
        file_keys.extend([img.storage_key for img in stale_insp.images if img.storage_key])
    if stale_insp.reports:
        file_keys.extend([rep.storage_key for rep in stale_insp.reports if rep.storage_key])
    if stale_insp.artifacts:
        file_keys.extend([art.storage_key for art in stale_insp.artifacts if art.storage_key])
    if stale_insp.image_path:
        file_keys.extend([k.strip() for k in stale_insp.image_path.split(",") if k.strip()])

    # 2. Strict foreign-key ordered deletion
    for t in ['defect_measurements', 'graded_defect_records']:
        session.execute(text(f'DELETE FROM {t} WHERE detection_id IN (SELECT id FROM detections WHERE inspection_id = 9)'))
    for t in ['detections', 'inspection_measurements', 'inspection_images', 'topology_files', 'inspection_reports', 'processing_artifacts', 'processing_jobs', 'evaluation_histories']:
        session.execute(text(f'DELETE FROM {t} WHERE inspection_id = 9'))
    session.execute(text('DELETE FROM inspections WHERE id = 9'))
    session.commit()

    # 3. Topology storage cleanup
    try:
        topology_storage.delete_topology(9)
    except Exception as exc:
        logger.warning(f"Notice while removing topology for obsolete record 9: {exc}")

    # 4. Delete physical files from storage if not referenced elsewhere
    for key in set(file_keys):
        try:
            other_ref = session.exec(
                select(InspectionImage).where(InspectionImage.storage_key == key)
            ).first()
            if not other_ref and storage.exists(key):
                storage.delete(key)
        except Exception as exc:
            logger.warning(f"Notice while removing storage file {key}: {exc}")

    # 5. If no inspection records remain, safely reset sequence counter
    remaining = session.exec(select(func.count(Inspection.id))).one()
    if remaining == 0:
        try:
            session.execute(text("""
                DELETE FROM sqlite_sequence 
                WHERE name IN (
                    'inspections', 'inspection_images', 'processing_jobs', 
                    'processing_artifacts', 'inspection_reports', 'topology_files', 
                    'detections', 'defect_measurements', 'graded_defect_records', 
                    'inspection_measurements', 'evaluation_histories'
                )
            """))
            session.commit()
        except Exception:
            pass

    logger.info("Successfully eliminated obsolete Record #9 at database source.")
    return True


if __name__ == "__main__":
    seed_database()
