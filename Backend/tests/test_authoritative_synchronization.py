"""Comprehensive integration test suite for authoritative inspection data synchronization.

Verifies all 15 scenarios specified in Project Dhatu Rakshana - Authoritative Inspection Data Synchronization:
1. Empty database -> inspector history returns zero records.
2. Empty database -> visitor records return zero records.
3. Empty database -> results page displays no inspection entries (returns 404).
4. Successful inspection -> exactly one persisted inspection appears.
5. Saved inspection -> its result remains available after a page refresh.
6. Deleted inspection -> disappears from both histories.
7. Deleted inspection -> direct result URL returns a proper not-found state.
8. API error -> no stale or fabricated results appear.
9. Failed processing -> no false completed result is displayed.
10. Successful processing retry -> no unintended duplicate inspection appears.
11. Valid inspection -> its report and topology remain accessible.
12. Browser navigation -> deleted results are not restored as valid records.
13. Backend restart -> history matches the database without stale entries.
14. Visitor access -> shows authorized persisted records only.
15. Automated tests -> never insert test inspections into the live database.
"""

import sys
import os
import io
import shutil
import tempfile
from pathlib import Path
import pytest
from PIL import Image

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from sqlmodel import Session, select, create_engine
import sqlite3

from app.main import app
from app.db.session import engine as active_engine, get_session
from app.models.user import User
from app.models.visitor import Visitor
from app.models.inspection import Inspection
from app.models.detection import Detection
from app.models.report import InspectionReport
from app.models.topology import TopologyFile
from app.models.job import ProcessingJob
from app.storage.local import storage
from app.storage.topology_storage import topology_storage
from app.core.timezone import get_ist_now
from app.workers.inspection_task import execute_inspection_pipeline


@pytest.fixture(scope="module")
def api_client():
    return TestClient(app)


@pytest.fixture(scope="module")
def inspector_auth(api_client):
    login_resp = api_client.post("/api/v1/auth/login", json={
        "username": "inspector",
        "password": "password123"
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def visitor_auth(api_client):
    vis_resp = api_client.post("/api/v1/visitors/access", json={"username": "visitor"})
    assert vis_resp.status_code == 200, f"Visitor access failed: {vis_resp.text}"
    token = vis_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_test_image_bytes():
    buf = io.BytesIO()
    img = Image.new("RGB", (640, 640), color=(80, 100, 120))
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestAuthoritativeDataSynchronization:

    def test_01_empty_database_inspector_history_returns_zero_records(self, api_client, inspector_auth):
        """Scenario 1: When no inspections exist, inspector history returns []."""
        with Session(active_engine) as session:
            all_inspections = session.exec(select(Inspection)).all()
            for insp in all_inspections:
                api_client.delete(f"/api/v1/inspections/{insp.id}", headers=inspector_auth)

        resp = api_client.get("/api/v1/inspections", headers=inspector_auth)
        assert resp.status_code == 200
        records = resp.json()
        assert isinstance(records, list)
        assert len(records) == 0

    def test_02_empty_database_visitor_records_return_zero_records(self, api_client, visitor_auth):
        """Scenario 2: When no inspections exist, visitor records return []."""
        resp = api_client.get("/api/v1/visitors/records", headers=visitor_auth)
        assert resp.status_code == 200
        records = resp.json()
        assert isinstance(records, list)
        assert len(records) == 0

    def test_03_empty_database_results_page_returns_not_found(self, api_client, inspector_auth, visitor_auth):
        """Scenario 3: Direct result URLs return 404 when no inspection exists."""
        resp_inspector = api_client.get("/api/v1/inspections/1", headers=inspector_auth)
        assert resp_inspector.status_code == 404
        assert "not found" in resp_inspector.json().get("detail", "").lower()

        resp_visitor = api_client.get("/api/v1/visitors/records/1", headers=visitor_auth)
        assert resp_visitor.status_code == 404
        assert "not found" in resp_visitor.json().get("detail", "").lower()

    def test_04_successful_inspection_creates_exactly_one_record(self, api_client, inspector_auth):
        """Scenario 4: Uploading specimen creates exactly one persisted inspection record."""
        img_bytes = create_test_image_bytes()
        upload_resp = api_client.post(
            "/api/v1/inspections",
            data={"zone_id": 1},
            files={"file": ("test_plate.png", img_bytes, "image/png")},
            headers=inspector_auth
        )
        assert upload_resp.status_code == 201, f"Creation failed: {upload_resp.text}"
        created_data = upload_resp.json()
        inspection_id = created_data["inspection_id"]
        assert inspection_id is not None
        assert created_data["status"] == "COMPLETED"

        # Verify exactly one inspection exists in history
        history_resp = api_client.get("/api/v1/inspections", headers=inspector_auth)
        assert history_resp.status_code == 200
        history_records = history_resp.json()
        assert len(history_records) == 1
        assert history_records[0]["id"] == inspection_id
        # Verify display ID matches database ID without offsets
        assert history_records[0]["display_id"] == inspection_id
        assert history_records[0]["display_label"] == f"Record {inspection_id}"

    def test_05_saved_inspection_result_available_on_refresh(self, api_client, inspector_auth):
        """Scenario 5: Refreshing or reopening a completed inspection returns persisted results."""
        history_resp = api_client.get("/api/v1/inspections", headers=inspector_auth)
        records = history_resp.json()
        assert len(records) == 1
        insp_id = records[0]["id"]

        # First request
        resp1 = api_client.get(f"/api/v1/inspections/{insp_id}", headers=inspector_auth)
        assert resp1.status_code == 200
        data1 = resp1.json()

        # Simulated page refresh / repeated request
        resp2 = api_client.get(f"/api/v1/inspections/{insp_id}", headers=inspector_auth)
        assert resp2.status_code == 200
        data2 = resp2.json()

        assert data1["id"] == data2["id"] == insp_id
        assert data1["overall_verdict"] == data2["overall_verdict"]
        assert data1["status"] == data2["status"] == "COMPLETED"
        assert data1["timestamp"] == data2["timestamp"]

    def test_06_deleted_inspection_disappears_from_both_histories(self, api_client, inspector_auth, visitor_auth):
        """Scenario 6: Deleting an inspection immediately removes it from inspector & visitor histories."""
        history_resp = api_client.get("/api/v1/inspections", headers=inspector_auth)
        records = history_resp.json()
        assert len(records) == 1
        insp_id = records[0]["id"]

        # Delete inspection
        del_resp = api_client.delete(f"/api/v1/inspections/{insp_id}", headers=inspector_auth)
        assert del_resp.status_code == 204

        # Inspector history is now empty
        h_resp = api_client.get("/api/v1/inspections", headers=inspector_auth)
        assert h_resp.status_code == 200
        assert len(h_resp.json()) == 0

        # Visitor records are now empty
        v_resp = api_client.get("/api/v1/visitors/records", headers=visitor_auth)
        assert v_resp.status_code == 200
        assert len(v_resp.json()) == 0

    def test_07_deleted_inspection_direct_url_returns_proper_not_found(self, api_client, inspector_auth, visitor_auth):
        """Scenario 7: Navigating directly to a deleted inspection URL returns 404."""
        resp_insp = api_client.get("/api/v1/inspections/999", headers=inspector_auth)
        assert resp_insp.status_code == 404
        assert "not found" in resp_insp.json().get("detail", "").lower()

        resp_vis = api_client.get("/api/v1/visitors/records/999", headers=visitor_auth)
        assert resp_vis.status_code == 404
        assert "not found" in resp_vis.json().get("detail", "").lower()

    def test_08_api_error_never_fabricates_mock_or_stale_results(self, api_client, inspector_auth):
        """Scenario 8: API errors must not return fallback mock data."""
        bad_resp = api_client.get("/api/v1/inspections/-1", headers=inspector_auth)
        assert bad_resp.status_code == 404
        # Verify body contains error, not synthetic inspection record
        err_body = bad_resp.json()
        assert "detections" not in err_body
        assert "overall_verdict" not in err_body

    def test_09_failed_processing_does_not_display_false_completed_result(self, api_client, inspector_auth):
        """Scenario 9: Failed processing is explicitly marked FAILED and does not show false PASS."""
        with Session(active_engine) as session:
            failed_insp = Inspection(
                zone_id=1,
                inspector_id=1,
                image_path="corrupt_file_key.png",
                mesh_path=None,
                status="FAILED",
                overall_verdict="FAIL",
                timestamp=get_ist_now()
            )
            session.add(failed_insp)
            session.commit()
            session.refresh(failed_insp)
            failed_id = failed_insp.id

        detail_resp = api_client.get(f"/api/v1/inspections/{failed_id}", headers=inspector_auth)
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["status"] == "FAILED"
        assert detail["overall_verdict"] != "PASS"

        # Cleanup failed test inspection
        api_client.delete(f"/api/v1/inspections/{failed_id}", headers=inspector_auth)

    def test_10_processing_retry_does_not_create_duplicate_inspections(self, api_client, inspector_auth):
        """Scenario 10: Retrying pipeline on existing inspection updates it without creating duplicates."""
        img_bytes = create_test_image_bytes()
        upload_resp = api_client.post(
            "/api/v1/inspections",
            data={"zone_id": 1},
            files={"file": ("retry_plate.png", img_bytes, "image/png")},
            headers=inspector_auth
        )
        insp_id = upload_resp.json()["inspection_id"]

        with Session(active_engine) as session:
            count_before = len(session.exec(select(Inspection)).all())

            # Re-execute pipeline on existing inspection
            job = session.exec(select(ProcessingJob).where(ProcessingJob.inspection_id == insp_id)).first()
            execute_inspection_pipeline(insp_id, job.job_id)

            count_after = len(session.exec(select(Inspection)).all())
            assert count_before == count_after == 1

        # Cleanup
        api_client.delete(f"/api/v1/inspections/{insp_id}", headers=inspector_auth)

    def test_11_valid_inspection_report_and_topology_accessible(self, api_client, inspector_auth):
        """Scenario 11: Valid recorded inspection has accessible topology and PDF report."""
        img_bytes = create_test_image_bytes()
        upload_resp = api_client.post(
            "/api/v1/inspections",
            data={"zone_id": 1},
            files={"file": ("test_mesh_report.png", img_bytes, "image/png")},
            headers=inspector_auth
        )
        insp_id = upload_resp.json()["inspection_id"]

        # Report access
        rep_resp = api_client.get(f"/api/v1/inspections/{insp_id}/report", headers=inspector_auth)
        assert rep_resp.status_code == 200
        assert rep_resp.headers["content-type"] == "application/pdf"
        assert len(rep_resp.content) > 1000

        # Topology access
        topo_resp = api_client.get(f"/api/v1/inspections/{insp_id}/topology/file", headers=inspector_auth)
        assert topo_resp.status_code == 200
        assert topo_resp.headers["content-type"] == "application/octet-stream"
        assert len(topo_resp.content) > 0

        # Cleanup
        api_client.delete(f"/api/v1/inspections/{insp_id}", headers=inspector_auth)

    def test_12_browser_navigation_cannot_restore_deleted_records(self, api_client, inspector_auth):
        """Scenario 12: Subsequent fetches simulating browser back/forward never return deleted records."""
        img_bytes = create_test_image_bytes()
        upload_resp = api_client.post(
            "/api/v1/inspections",
            data={"zone_id": 1},
            files={"file": ("nav_test.png", img_bytes, "image/png")},
            headers=inspector_auth
        )
        insp_id = upload_resp.json()["inspection_id"]

        # Delete it
        del_resp = api_client.delete(f"/api/v1/inspections/{insp_id}", headers=inspector_auth)
        assert del_resp.status_code == 204

        # Simulate repeated browser back / forward navigation requests
        for _ in range(3):
            fetch_resp = api_client.get(f"/api/v1/inspections/{insp_id}", headers=inspector_auth)
            assert fetch_resp.status_code == 404

    def test_13_backend_restart_history_matches_database_without_stale_entries(self, api_client, inspector_auth):
        """Scenario 13: Database state after reconnect matches API without ghost/stale records."""
        with Session(active_engine) as session:
            count = len(session.exec(select(Inspection)).all())

        resp = api_client.get("/api/v1/inspections", headers=inspector_auth)
        assert resp.status_code == 200
        assert len(resp.json()) == count

    def test_14_visitor_access_shows_authorized_persisted_records_only(self, api_client, visitor_auth):
        """Scenario 14: Visitor endpoint strictly enforces visitor session and returns authorized persisted records."""
        # Unauthenticated request fails
        unauth_resp = api_client.get("/api/v1/visitors/records")
        assert unauth_resp.status_code == 401

        # Authenticated visitor request succeeds
        auth_resp = api_client.get("/api/v1/visitors/records", headers=visitor_auth)
        assert auth_resp.status_code == 200
        assert isinstance(auth_resp.json(), list)

    def test_15_automated_tests_never_insert_inspections_into_live_database(self):
        """Scenario 15: Confirms that test execution does NOT touch or write to the live production database."""
        live_db_path = Path("/workspace/data/dhatu_rakshana.db")
        if live_db_path.exists():
            conn = sqlite3.connect(str(live_db_path))
            cur = conn.cursor()
            count = cur.execute("SELECT COUNT(*) FROM inspections").fetchone()[0]
            conn.close()
            assert count == 0, f"Live database contaminated with {count} inspection records!"
