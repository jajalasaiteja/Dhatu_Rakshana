import os
import shutil
import sys
from pathlib import Path
import pytest
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv

# Ensure Backend is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Load .env if present
for env_path in [backend_dir / ".env", backend_dir.parent.parent / ".env"]:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=False)

TEST_DIR = Path("/tmp/dhatu_test_isolated")
if TEST_DIR.exists():
    shutil.rmtree(TEST_DIR, ignore_errors=True)
TEST_DIR.mkdir(parents=True, exist_ok=True)

TEST_STORAGE_PATH = TEST_DIR / "storage"
TEST_STORAGE_PATH.mkdir(parents=True, exist_ok=True)

# Point environment to PostgreSQL - SQLite is strictly rejected
POSTGRES_TEST_URL = os.getenv(
    "TEST_DATABASE_URL",
    os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgrespassword@localhost:5432/marine_defect_db"
    )
)
os.environ["DATABASE_URL"] = POSTGRES_TEST_URL
os.environ["STORAGE_DIR"] = str(TEST_STORAGE_PATH.resolve())

_db_initialized = False

def ensure_test_database_initialized():
    """Initializes tables and seeds test database with reference data and isolated test fixture."""
    global _db_initialized
    if _db_initialized:
        return

    from app.db.session import init_db, engine
    from app.db.seed import seed_database
    from sqlmodel import Session
    from app.models.inspection import Inspection
    from app.models.detection import Detection
    from app.models.measurement import DefectMeasurement
    from app.models.inspection_image import InspectionImage
    from app.models.topology import TopologyFile
    from app.core.timezone import get_ist_now

    # Copy a real sample image into isolated test storage
    bucket_dir = TEST_STORAGE_PATH / "buckets" / "marine-inspections"
    bucket_dir.mkdir(parents=True, exist_ok=True)
    sample_src = Path("/workspace/Project Dhatu Rakshana/Backend/data/datasets/synthetic_defects/images/marine_scan_001_pinhole.png")
    test_img_dst = bucket_dir / "test_specimen.png"
    if sample_src.exists():
        shutil.copyfile(sample_src, test_img_dst)
    else:
        from PIL import Image
        img_dummy = Image.new("RGB", (640, 640), color=(120, 130, 125))
        img_dummy.save(test_img_dst)

    # Check PostgreSQL connection
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("SELECT 1"))
    except (OperationalError, Exception) as exc:
        pytest.skip(f"PostgreSQL test database not available ({exc}). Start PostgreSQL via Docker or local service to execute integration tests.")

    init_db()
    seed_database()

    with Session(engine) as session:
        existing = session.get(Inspection, 8)
        if not existing:
            now = get_ist_now()
            insp = Inspection(
                id=8,
                zone_id=1,
                inspector_id=1,
                image_path="test_specimen.png",
                mesh_path="/api/v1/inspections/8/topology/file",
                status="COMPLETED",
                overall_verdict="FAIL",
                preprocessing_version="1.0.0",
                timestamp=now,
                created_at=now,
                updated_at=now
            )
            session.add(insp)
            session.commit()
            session.refresh(insp)

            img = InspectionImage(
                id=1,
                inspection_id=8,
                storage_key="test_specimen.png",
                original_filename="sample_test_image_1.jpg",
                file_size_bytes=1024,
                width=640,
                height=640,
                is_primary=True,
                created_at=now
            )
            session.add(img)
            session.commit()
            session.refresh(img)

            det = Detection(
                id=1,
                inspection_id=8,
                image_id=1,
                class_name="defect",
                subtype="corrosion",
                bbox_raw="[10, 10, 50, 50]",
                confidence=0.92,
                area_pct=2.5,
                severity="HIGH"
            )
            session.add(det)
            session.commit()
            session.refresh(det)

            meas = DefectMeasurement(
                detection_id=det.id,
                bbox_width=40.0,
                bbox_height=40.0,
                aspect_ratio=1.0,
                pixel_area=1600.0,
                area_pct=2.5,
                centroid_x=30.0,
                centroid_y=30.0,
                created_at=now
            )
            session.add(meas)

            topo_dir = TEST_STORAGE_PATH / "topology" / "8"
            topo_dir.mkdir(parents=True, exist_ok=True)
            topo_file = topo_dir / "topology.ply"
            topo_file.write_bytes(b"ply\nformat ascii 1.0\nelement vertex 0\nend_header\n")

            topo = TopologyFile(
                id=1,
                inspection_id=8,
                original_filename="sample_surface_mesh_8.ply",
                stored_filename="topology.ply",
                storage_path=str(topo_file),
                file_size=len(topo_file.read_bytes()),
                file_hash="test_sha256_hash",
                created_at=now,
                updated_at=now
            )
            session.add(topo)
            session.commit()

    _db_initialized = True


@pytest.fixture(autouse=True)
def check_test_db(request):
    """Automatically initialize PostgreSQL for database-dependent integration tests."""
    db_test_modules = {
        "test_authoritative_synchronization",
        "test_iso_evaluation_engine",
        "test_stale_record_9_resolution",
    }
    module_name = request.node.module.__name__ if hasattr(request.node, "module") and request.node.module else ""
    if any(m in module_name for m in db_test_modules):
        ensure_test_database_initialized()
