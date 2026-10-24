"""Comprehensive regression test suite for resolving stale Record 9 and validating sequential record indexing."""

import sys
import os
import io
from pathlib import Path
from PIL import Image

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from sqlmodel import Session, select, func, text
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import engine
from app.db.seed import purge_obsolete_record_9, seed_database
from app.models.inspection import Inspection
from app.models.inspection_image import InspectionImage
from app.models.detection import Detection
from app.models.measurement import DefectMeasurement
from app.models.grading import GradedDefectRecord
from app.models.evaluation import InspectionMeasurement, EvaluationHistory
from app.models.artifact import ProcessingArtifact
from app.models.job import ProcessingJob
from app.models.report import InspectionReport
from app.models.topology import TopologyFile
from app.core.timezone import get_ist_now

client = TestClient(app)

@pytest.fixture
def auth_headers():
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "inspector",
        "password": "password123"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def visitor_headers():
    vis_resp = client.post("/api/v1/visitors/access", json={"username": "visitor"})
    assert vis_resp.status_code == 200
    token = vis_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_01_purge_obsolete_record_9_removes_stale_record_and_dependencies():
    """Verify purge_obsolete_record_9 identifies and completely cascades obsolete historical Record 9."""
    now = get_ist_now()
    with Session(engine) as session:
        # 1. Seed an obsolete Record 9 matching historical scan signature
        stale_insp = Inspection(
            id=9,
            zone_id=1,
            inspector_id=1,
            image_path="images/2026/10/02/48aec7c704_marine_scan_001_pinhole.png",
            mesh_path="/api/v1/inspections/9/topology/file",
            status="COMPLETED",
            overall_verdict="FAIL",
            preprocessing_version="1.0.0",
            timestamp=now,
            created_at=now
        )
        img = InspectionImage(
            storage_key="images/2026/10/02/48aec7c704_marine_scan_001_pinhole.png",
            original_filename="marine_scan_001_pinhole.png",
            file_size_bytes=1024,
            width=640,
            height=640,
            is_primary=True,
            created_at=now
        )
        stale_insp.images.append(img)
        session.add(stale_insp)
        session.commit()
        session.refresh(stale_insp)
        session.refresh(img)

        # 2. Add detection and grandchild measurement
        det = Detection(
            inspection_id=9,
            image_id=img.id,
            class_name="defect",
            subtype="corrosion",
            bbox_raw="[0.0, 0.0, 640.0, 640.0]",
            confidence=0.95,
            area_pct=10.0,
            severity="Critical"
        )
        session.add(det)
        session.commit()
        session.refresh(det)

        meas = DefectMeasurement(
            detection_id=det.id,
            pixel_area=409600.0,
            area_pct=10.0
        )
        saved_det_id = det.id
        session.add(meas)
        session.commit()

        # 3. Run obsolete record 9 purge
        purged = purge_obsolete_record_9(session)
        assert purged is True

        # 4. Verify parent and all children were removed
        assert session.get(Inspection, 9) is None
        assert session.exec(select(InspectionImage).where(InspectionImage.inspection_id == 9)).all() == []
        assert session.exec(select(Detection).where(Detection.inspection_id == 9)).all() == []
        assert session.exec(select(DefectMeasurement).where(DefectMeasurement.detection_id == saved_det_id)).all() == []


def test_02_inspection_listing_api_does_not_return_deleted_record_9(auth_headers, visitor_headers):
    """Verify inspection and visitor listing endpoints never return deleted Record 9."""
    # Inspector listing
    resp = client.get("/api/v1/inspections", headers=auth_headers)
    assert resp.status_code == 200
    ids = [item["id"] for item in resp.json()]
    assert 9 not in ids

    # Visitor listing
    v_resp = client.get("/api/v1/visitors/records", headers=visitor_headers)
    assert v_resp.status_code == 200
    v_ids = [item["id"] for item in v_resp.json()]
    assert 9 not in v_ids

    # Direct detail access for 9 returns 404
    d_resp = client.get("/api/v1/inspections/9", headers=auth_headers)
    assert d_resp.status_code == 404

    vd_resp = client.get("/api/v1/visitors/records/9", headers=visitor_headers)
    assert vd_resp.status_code == 404


def test_03_sequential_numbering_starts_from_1_and_increments(auth_headers):
    """Verify sequential numbering: starts at 1, increments sequentially, handles deletion without renumbering."""
    def make_img():
        buf = io.BytesIO()
        Image.new("RGB", (100, 100), color=(100, 150, 200)).save(buf, format="PNG")
        buf.seek(0)
        return buf.getvalue()

    # Clear all inspection records for clean sequence test
    with Session(engine) as s:
        for t in ['defect_measurements', 'graded_defect_records']:
            s.execute(text(f'DELETE FROM {t}'))
        for t in ['detections', 'inspection_measurements', 'inspection_images', 'topology_files', 'inspection_reports', 'processing_artifacts', 'processing_jobs', 'evaluation_histories']:
            s.execute(text(f'DELETE FROM {t}'))
        s.execute(text('DELETE FROM inspections'))
        s.commit()

    # Create first inspection -> must be ID 1 / Record 1
    resp1 = client.post(
        "/api/v1/inspections",
        data={"zone_id": 1},
        files={"file": ("test_plate_1.png", make_img(), "image/png")},
        headers=auth_headers
    )
    assert resp1.status_code == 201
    id1 = resp1.json()["inspection_id"]
    assert id1 == 1

    detail1 = client.get(f"/api/v1/inspections/{id1}", headers=auth_headers).json()
    assert detail1["display_label"] == "Record 1"

    # Create second inspection -> must be ID 2 / Record 2
    resp2 = client.post(
        "/api/v1/inspections",
        data={"zone_id": 1},
        files={"file": ("test_plate_2.png", make_img(), "image/png")},
        headers=auth_headers
    )
    assert resp2.status_code == 201
    id2 = resp2.json()["inspection_id"]
    assert id2 == 2

    # Create third inspection -> must be ID 3 / Record 3
    resp3 = client.post(
        "/api/v1/inspections",
        data={"zone_id": 1},
        files={"file": ("test_plate_3.png", make_img(), "image/png")},
        headers=auth_headers
    )
    assert resp3.status_code == 201
    id3 = resp3.json()["inspection_id"]
    assert id3 == 3

    # Delete intermediate Record 2
    del_resp = client.delete(f"/api/v1/inspections/{id2}", headers=auth_headers)
    assert del_resp.status_code in (200, 204)

    # Verify surviving records 1 and 3 are NOT renumbered
    detail1_after = client.get(f"/api/v1/inspections/{id1}", headers=auth_headers).json()
    assert detail1_after["id"] == 1
    assert detail1_after["display_label"] == "Record 1"

    detail3_after = client.get(f"/api/v1/inspections/{id3}", headers=auth_headers).json()
    assert detail3_after["id"] == 3
    assert detail3_after["display_label"] == "Record 3"

    # Create fourth inspection -> must be ID 4 (max_id + 1)
    resp4 = client.post(
        "/api/v1/inspections",
        data={"zone_id": 1},
        files={"file": ("test_plate_4.png", make_img(), "image/png")},
        headers=auth_headers
    )
    assert resp4.status_code == 201
    id4 = resp4.json()["inspection_id"]
    assert id4 == 4

    # Cleanup created test inspections
    for i in [id1, id3, id4]:
        client.delete(f"/api/v1/inspections/{i}", headers=auth_headers)

    # After deleting all, verify next record starts again at 1
    resp_new = client.post(
        "/api/v1/inspections",
        data={"zone_id": 1},
        files={"file": ("test_plate_new.png", make_img(), "image/png")},
        headers=auth_headers
    )
    assert resp_new.status_code == 201
    assert resp_new.json()["inspection_id"] == 1
    # Cleanup
    client.delete(f"/api/v1/inspections/{resp_new.json()['inspection_id']}", headers=auth_headers)


def test_04_restart_does_not_recreate_stale_record():
    """Verify that calling seed_database() (which runs on backend startup) does not recreate Record 9."""
    seed_database()
    with Session(engine) as session:
        insp9 = session.get(Inspection, 9)
        assert insp9 is None
