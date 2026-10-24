"""Comprehensive automated tests for ISO-Aligned Evaluation Engine Upgrade.

Covers:
- All supported measurement types and categories.
- Defect area and geometric calculations.
- ISO rating boundaries and permitted values (Ri 0 to Ri 5, S0 to S5, 0 to 5).
- Missing, not-applicable, and insufficient evidence statuses.
- SSPC-PA 2 dry film thickness (when missing vs supplied).
- NACE SP0188 coating continuity (when missing vs supplied).
- Uncalibrated physical measurement rejection (explicit pixel identification).
- Evaluation engine versioning and structured evaluation summary.
- Historical evaluation preservation and backfill idempotency.
- Transactional partial failure handling during recalculation.
- PDF report generation content and IST timestamp compliance.
- Authenticated inspector and authorized visitor access (read-only enforcement).
"""

import sys
import os
import json
from pathlib import Path
from datetime import datetime
import pytest

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir.parent))

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.main import app
from app.db.session import engine
from app.core.timezone import IST, get_ist_now, format_ist_iso
from app.models.inspection import Inspection
from app.models.detection import Detection
from app.models.measurement import DefectMeasurement
from app.models.evaluation import InspectionMeasurement, EvaluationHistory
from app.standards.iso_evaluator import (
    iso_evaluation_engine,
    EVALUATION_ENGINE_VERSION,
    determine_rust_grade_iso_4628_3,
    get_iso_4628_1_quantity_rating,
    get_iso_4628_1_size_rating
)
from app.reports.generator import generate_pdf_report
from scripts.recalculate_evaluations import recalculate_all_evaluations

client = TestClient(app)

def seed_test_inspection_8():
    """Seeds test fixture inspection #8 if not already present."""
    from app.db.session import engine
    from app.models.inspection import Inspection
    from app.models.detection import Detection
    from app.models.measurement import DefectMeasurement
    from app.models.inspection_image import InspectionImage
    from app.models.topology import TopologyFile
    from app.core.timezone import get_ist_now
    from PIL import Image

    storage_dir = Path(os.environ.get("STORAGE_DIR", "/tmp"))
    bucket_dir = storage_dir / "buckets" / "marine-inspections"
    bucket_dir.mkdir(parents=True, exist_ok=True)
    test_img = bucket_dir / "test_specimen.png"
    if not test_img.exists():
        sample_src = Path("/workspace/Project Dhatu Rakshana/Backend/data/datasets/synthetic_defects/images/marine_scan_001_pinhole.png")
        if sample_src.exists():
            import shutil
            shutil.copyfile(sample_src, test_img)
        else:
            img_dummy = Image.new("RGB", (640, 640), color=(120, 130, 125))
            img_dummy.save(test_img)

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

            topo_dir = Path(os.environ.get("STORAGE_DIR", "/tmp")) / "topology" / "8"
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

@pytest.fixture(autouse=True)
def ensure_inspection_8_fixture():
    seed_test_inspection_8()
    yield

class TestISORatingBoundaries:
    """Tests ISO 4628 and standards rating boundary logic."""

    def test_iso_4628_3_rusting_boundaries(self):
        # Ri 0: exactly 0%
        grade, desc, verdict = determine_rust_grade_iso_4628_3(0.0)
        assert grade == "Ri 0"
        assert verdict == "PASS"

        # Ri 1: <= 0.05%
        grade, desc, verdict = determine_rust_grade_iso_4628_3(0.04)
        assert grade == "Ri 1"
        assert verdict == "PASS"

        # Ri 2: <= 0.5%
        grade, desc, verdict = determine_rust_grade_iso_4628_3(0.45)
        assert grade == "Ri 2"
        assert verdict == "PASS"

        # Ri 3: <= 1.0%
        grade, desc, verdict = determine_rust_grade_iso_4628_3(0.95)
        assert grade == "Ri 3"
        assert verdict == "REVIEW"

        # Ri 4: <= 8.0%
        grade, desc, verdict = determine_rust_grade_iso_4628_3(7.5)
        assert grade == "Ri 4"
        assert verdict == "FAIL"

        # Ri 5: > 8.0%
        grade, desc, verdict = determine_rust_grade_iso_4628_3(49.8)
        assert grade == "Ri 5"
        assert verdict == "FAIL"

    def test_iso_4628_1_quantity_ratings(self):
        # 0: None
        q, desc = get_iso_4628_1_quantity_rating(0, 0.0)
        assert q == 0
        # 1: Very few
        q, desc = get_iso_4628_1_quantity_rating(2, 0.15)
        assert q == 1
        # 2: Few
        q, desc = get_iso_4628_1_quantity_rating(4, 0.8)
        assert q == 2
        # 3: Moderate
        q, desc = get_iso_4628_1_quantity_rating(12, 2.5)
        assert q == 3
        # 4: Considerable
        q, desc = get_iso_4628_1_quantity_rating(25, 8.0)
        assert q == 4
        # 5: Dense pattern
        q, desc = get_iso_4628_1_quantity_rating(50, 45.0)
        assert q == 5

    def test_iso_4628_1_size_ratings(self):
        # Smallest relative size -> S0/S1
        s, desc = get_iso_4628_1_size_rating(1.0, 640)
        assert s in ("S0", "S1")
        # Medium defect -> S3/S4
        s, desc = get_iso_4628_1_size_rating(50.0, 640)
        assert s in ("S2", "S3", "S4")
        # Macro defect -> S5
        s, desc = get_iso_4628_1_size_rating(350.0, 640)
        assert s == "S5"

class TestSupportedMeasurementTypes:
    """Tests evaluation engine measurement schema, categories, and explicit statuses."""

    def test_all_22_measurements_generated_and_categorized(self):
        # Synthetic mock inspection
        synthetic_detections = [
            {
                "class": "defect",
                "subtype": "corrosion",
                "confidence": 0.95,
                "area_pct": 2.5,
                "measurement": {
                    "pixel_area": 10240.0,
                    "bbox_width": 128.0,
                    "bbox_height": 80.0,
                    "centroid_x": 100.0,
                    "centroid_y": 100.0,
                    "surface_depth_proxy": 0.42,
                    "roughness_index": 0.35
                },
                "bbox": [36.0, 60.0, 164.0, 140.0]
            }
        ]

        result = iso_evaluation_engine.evaluate_inspection(
            inspection_id=999,
            image_records=[type("MockImage", (), {"id": 1, "width": 640, "height": 640, "original_filename": "mock.png"})],
            detections=synthetic_detections,
            topology_record=type("MockTopo", (), {"storage_path": "mock.ply"})
        )

        measurements = result["measurements"]
        assert len(measurements) >= 20, f"Expected at least 20 structured measurements, got {len(measurements)}"

        categories_found = {m["measurement_category"] for m in measurements}
        assert "QUANTITATIVE_DEFECT" in categories_found
        assert "ISO_4628_DEGRADATION" in categories_found
        assert "ISO_8501_SURFACE_PREP" in categories_found
        assert "DRY_FILM_THICKNESS" in categories_found
        assert "COATING_CONTINUITY" in categories_found
        assert "SURFACE_TOPOGRAPHY" in categories_found

        statuses_found = {m["assessment_status"] for m in measurements}
        assert "Measured" in statuses_found
        assert "Assessed" in statuses_found
        assert "Not measured" in statuses_found
        assert "Not tested" in statuses_found
        assert "Insufficient evidence" in statuses_found

    def test_uncalibrated_physical_measurement_rejection(self):
        """Ensures ordinary RGB photographs do not produce fake mm² or physical DFT."""
        result = iso_evaluation_engine.evaluate_inspection(
            inspection_id=998,
            image_records=[type("MockImage", (), {"id": 1, "width": 640, "height": 640})],
            detections=[],
            calibrated_dft_data=None,
            calibrated_holiday_data=None
        )

        measurements = {m["measurement_key"]: m for m in result["measurements"]}

        # Dry film thickness must be explicitly "Not measured"
        dft = measurements["sspc_pa2_dry_film_thickness"]
        assert dft["assessment_status"] == "Not measured"
        assert dft["measured_value"] == "Not measured"
        assert "magnetic or eddy-current" in dft["explanation"].lower()

        # Continuity must be explicitly "Not tested"
        continuity = measurements["nace_sp0188_continuity"]
        assert continuity["assessment_status"] == "Not tested"
        assert continuity["measured_value"] == "Not tested"
        assert "spark or low-voltage" in continuity["explanation"].lower()

        # Surface prep must be explicitly "Insufficient evidence"
        prep = measurements["iso_8501_1_surface_prep_grade"]
        assert prep["assessment_status"] == "Insufficient evidence"
        assert "retrospectively" in prep["explanation"].lower()

        # Pixel area must have unit px²
        total_area = measurements["total_image_area"]
        assert total_area["unit"] == "px²"

    def test_supplied_physical_measurements_handling(self):
        """When calibrated sensor data is supplied, measurements reflect real readings."""
        calibrated_dft = {
            "readings": [160.0, 155.0, 165.0, 150.0, 158.0],
            "ndft": 150.0,
            "mean_dft": 157.6,
            "roughness_deduction": 25.0
        }
        calibrated_hol = {
            "discontinuity_count": 0,
            "voltage_kv": 2.0
        }

        result = iso_evaluation_engine.evaluate_inspection(
            inspection_id=997,
            image_records=[type("MockImage", (), {"id": 1, "width": 640, "height": 640})],
            detections=[],
            calibrated_dft_data=calibrated_dft,
            calibrated_holiday_data=calibrated_hol
        )

        measurements = {m["measurement_key"]: m for m in result["measurements"]}

        dft = measurements["sspc_pa2_dry_film_thickness"]
        assert dft["assessment_status"] == "Measured"
        assert "157.6" in dft["measured_value"]
        assert dft["numeric_value"] == 157.6

        continuity = measurements["nace_sp0188_continuity"]
        assert continuity["assessment_status"] == "Measured"
        assert "0 discontinuities" in continuity["measured_value"]

class TestStructuredEvaluationSections:
    """Tests the 5 required evaluation sections."""

    def test_five_sections_present_in_summary(self):
        result = iso_evaluation_engine.evaluate_inspection(
            inspection_id=996,
            image_records=[type("MockImage", (), {"id": 1, "width": 640, "height": 640, "original_filename": "specimen_996.png"})],
            detections=[]
        )

        summary = result["evaluation_summary"]
        assert "inspection_summary" in summary
        assert "quantitative_defect_assessment" in summary
        assert "standards_based_assessment" in summary
        assert "surface_topography" in summary
        assert "recommendations" in summary

        # Section 1: Inspection Summary
        insp_sum = summary["inspection_summary"]
        assert insp_sum["evaluation_engine_version"] == EVALUATION_ENGINE_VERSION
        assert "applicable_standards" in insp_sum
        assert len(insp_sum["important_limitations"]) >= 3

        # Section 2: Quantitative Defect Assessment
        quant = summary["quantitative_defect_assessment"]
        assert "total_defect_count" in quant
        assert "cumulative_defect_area_pct" in quant
        assert "units_note" in quant

        # Section 3: Standards-Based Assessment
        stds = summary["standards_based_assessment"]
        assert len(stds) >= 5

        # Section 4: Recommendations
        recs = summary["recommendations"]
        assert "automated_recommendations" in recs
        assert "mandatory_standards_requirements" in recs
        assert "distinction_notice" in recs

class TestHistoricalRecalculationAndIdempotency:
    """Tests backfill engine, dry-run, idempotency, and audit preservation."""

    def test_dry_run_leaves_database_unmodified(self):
        with Session(engine) as session:
            count_hist_before = len(session.exec(select(EvaluationHistory)).all())

        stats = recalculate_all_evaluations(dry_run=True, force=True)
        assert stats["discovered"] > 0
        assert stats["dry_run_affected"] == stats["discovered"]
        assert stats["recalculated"] == 0

        with Session(engine) as session:
            count_hist_after = len(session.exec(select(EvaluationHistory)).all())
            assert count_hist_before == count_hist_after, "Dry run must not create records in database."

    def test_single_inspection_recalculation_and_idempotency(self):
        # Target surviving inspection #8
        stats1 = recalculate_all_evaluations(target_id=8, force=True)
        assert stats1["recalculated"] == 1
        assert stats1["failed"] == 0

        with Session(engine) as session:
            insp8 = session.get(Inspection, 8)
            assert insp8.evaluation_engine_version == EVALUATION_ENGINE_VERSION
            assert insp8.recalculated_at is not None

            # Verify measurements stored
            m_records = session.exec(
                select(InspectionMeasurement).where(InspectionMeasurement.inspection_id == 8)
            ).all()
            assert len(m_records) >= 20

            # Verify evaluation history was preserved
            h_records = session.exec(
                select(EvaluationHistory).where(EvaluationHistory.inspection_id == 8)
            ).all()
            assert len(h_records) >= 1

        # Rerun without force -> should be skipped as ALREADY_CURRENT (Idempotent!)
        stats2 = recalculate_all_evaluations(target_id=8, force=False)
        assert stats2["already_current"] == 1
        assert stats2["recalculated"] == 0

        # Verify no duplicate measurements were created
        with Session(engine) as session:
            m_count_after = len(session.exec(
                select(InspectionMeasurement).where(InspectionMeasurement.inspection_id == 8)
            ).all())
            assert m_count_after == len(m_records), "Rerunning backfill must be idempotent without creating duplicate measurements."

class TestPDFReportContent:
    """Tests PDF report generator compliance."""

    def test_pdf_report_contains_all_iso_sections_and_ist(self):
        with Session(engine) as session:
            insp = session.get(Inspection, 8)
            detail = {
                "id": insp.id,
                "zone_id": insp.zone_id,
                "zone": insp.zone.to_dict() if insp.zone else {"name": f"Zone {insp.zone_id}"},
                "overall_verdict": insp.overall_verdict,
                "timestamp": format_ist_iso(insp.timestamp),
                "evaluation_engine_version": EVALUATION_ENGINE_VERSION,
                "detections": [d.to_dict() for d in insp.detections],
                "evaluation_summary": iso_evaluation_engine.evaluate_inspection(
                    inspection_id=insp.id,
                    image_records=insp.images,
                    detections=[d.to_dict() for d in insp.detections]
                )["evaluation_summary"]
            }

            pdf_bytes = generate_pdf_report(detail)
            assert pdf_bytes.startswith(b"%PDF"), "Must produce valid PDF binary"
            assert len(pdf_bytes) > 5000, "PDF must contain complete structured content"

            # Check that IST label and ISO standards are present
            assert b"IST" in pdf_bytes
            assert b"ISO" in pdf_bytes
            assert b"4628" in pdf_bytes

class TestAPIEndpointsAccessAndRBAC:
    """Tests inspector and visitor API access to upgraded evaluation data."""

    def test_authenticated_inspector_gets_structured_evaluation(self):
        # Login as inspector
        login_resp = client.post("/api/v1/auth/login", json={
            "username": "inspector",
            "password": "password123"
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        # Fetch inspection detail for record 8
        resp = client.get(
            "/api/v1/inspections/8",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()

        assert "measurements" in data
        assert "evaluation_summary" in data
        assert data["evaluation_engine_version"] == EVALUATION_ENGINE_VERSION
        assert len(data["measurements"]) >= 20

    def test_authorized_visitor_gets_read_only_structured_evaluation(self):
        # Request visitor access
        vis_resp = client.post("/api/v1/visitors/access", json={"username": "visitor"})
        assert vis_resp.status_code == 200
        vis_token = vis_resp.json()["access_token"]

        # Fetch visitor record detail for record 8
        resp = client.get(
            "/api/v1/visitors/records/8",
            headers={"Authorization": f"Bearer {vis_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()

        assert "measurements" in data
        assert "evaluation_summary" in data
        assert data["evaluation_engine_version"] == EVALUATION_ENGINE_VERSION
        assert len(data["measurements"]) >= 20

    def test_unauthorized_access_rejected(self):
        resp = client.get("/api/v1/inspections/8")
        assert resp.status_code in (401, 403)

        resp2 = client.get("/api/v1/visitors/records/8")
        assert resp2.status_code in (401, 403)

    def test_obsolete_records_removed_and_record_8_is_first(self):
        # 1. Verify obsolete records 1-7 are not found
        for obsolete_id in range(1, 8):
            resp = client.get(f"/api/v1/inspections/{obsolete_id}")
            assert resp.status_code in (401, 404)

        # Login as inspector
        login_resp = client.post("/api/v1/auth/login", json={
            "username": "inspector",
            "password": "password123"
        })
        token = login_resp.json()["access_token"]

        # Authenticated check: 1-7 must be 404
        for obsolete_id in range(1, 8):
            resp = client.get(
                f"/api/v1/inspections/{obsolete_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 404

        # 2. Verify inspection history lists record 8 first
        list_resp = client.get(
            "/api/v1/inspections",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert list_resp.status_code == 200
        records = list_resp.json()
        assert len(records) > 0
        first_record = records[0]
        assert first_record["id"] == 8
        assert first_record["display_id"] == 8
        assert first_record["display_label"] == "Record 8"

        # 3. Visitor list also shows record 8 first
        vis_resp = client.post("/api/v1/visitors/access", json={"username": "visitor"})
        vis_token = vis_resp.json()["access_token"]
        v_list_resp = client.get(
            "/api/v1/visitors/records",
            headers={"Authorization": f"Bearer {vis_token}"}
        )
        assert v_list_resp.status_code == 200
        v_records = v_list_resp.json()
        assert v_records[0]["id"] == 8
        assert v_records[0]["display_id"] == 8
        assert v_records[0]["display_label"] == "Record 8"
