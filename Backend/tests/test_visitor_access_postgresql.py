"""Focused integration tests for Visitor Access and Access Log creation with PostgreSQL.

Tests verify:
1. Visitor authentication and access token issuance via POST /api/v1/visitors/access.
2. Visitor access log creation in PostgreSQL with server-side IST timestamp and session ID.
3. Access denial for unauthorized visitor usernames (HTTP 401).
4. Authorized visitor access to read-only records via GET /api/v1/visitors/records.
5. Access controls: visitors cannot access inspector audit logs (HTTP 403/401).
6. Inspector audit retrieval of visitor activity logs via GET /api/v1/visitors/logs.
7. Verification that migrated legacy SQLite visitor access logs and visitors are preserved in PostgreSQL.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select, func

from app.main import app
from app.db.session import engine
from app.models.visitor import Visitor
from app.models.visitor_access_log import VisitorAccessLog


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_01_visitor_access_success_and_log_creation(client):
    """Test successful visitor access for 'visitor' username and log entry creation in PostgreSQL."""
    # Count logs before
    with Session(engine) as session:
        initial_log_count = session.exec(select(func.count(VisitorAccessLog.id))).one()

    # Request visitor access
    resp = client.post("/api/v1/visitors/access", json={"username": "visitor"})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["username"] == "visitor"
    assert data["role"] == "visitor"
    assert "session_id" in data
    assert data["session_id"] is not None
    assert "accessed_at" in data

    session_id = data["session_id"]

    # Verify access log was created in PostgreSQL
    with Session(engine) as session:
        new_log_count = session.exec(select(func.count(VisitorAccessLog.id))).one()
        assert new_log_count == initial_log_count + 1, "Expected log count to increment by 1"

        log_entry = session.exec(
            select(VisitorAccessLog).where(VisitorAccessLog.session_id == session_id)
        ).first()
        assert log_entry is not None, f"Log entry for session {session_id} not found in PostgreSQL"
        assert log_entry.visitor_username == "visitor"
        assert log_entry.event_type == "SUCCESSFUL_ACCESS"
        assert log_entry.accessed_at is not None
        assert log_entry.id is not None


def test_02_all_authorized_visitors_can_authenticate(client):
    """Verify each of the 5 authorized visitor identities can successfully authenticate."""
    authorized_visitors = [
        "visitor",
        "auditor",
        "defense_observer",
        "naval_cadet",
        "guest_evaluator"
    ]

    for uname in authorized_visitors:
        resp = client.post("/api/v1/visitors/access", json={"username": uname})
        assert resp.status_code == 200, f"Visitor '{uname}' failed authentication: {resp.text}"
        data = resp.json()
        assert data["username"] == uname
        assert data["role"] == "visitor"
        assert bool(data["access_token"]) is True


def test_03_unauthorized_visitor_username_rejected(client):
    """Verify unauthorized visitor username is rejected with HTTP 401."""
    with Session(engine) as session:
        initial_log_count = session.exec(select(func.count(VisitorAccessLog.id))).one()

    resp = client.post("/api/v1/visitors/access", json={"username": "unauthorized_intruder_99"})
    assert resp.status_code == 401
    assert "Invalid visitor username" in resp.json().get("detail", "")

    # Ensure no access log was created
    with Session(engine) as session:
        new_log_count = session.exec(select(func.count(VisitorAccessLog.id))).one()
        assert new_log_count == initial_log_count


def test_04_empty_visitor_username_rejected(client):
    """Verify empty or whitespace username is rejected with HTTP 422 or 400."""
    resp = client.post("/api/v1/visitors/access", json={"username": "   "})
    assert resp.status_code in (400, 422)


def test_05_visitor_can_fetch_records_with_token(client):
    """Verify an authenticated visitor can access permitted inspection records."""
    # Authenticate as auditor
    auth_resp = client.post("/api/v1/visitors/access", json={"username": "auditor"})
    assert auth_resp.status_code == 200
    token = auth_resp.json()["access_token"]

    # Request records with Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    rec_resp = client.get("/api/v1/visitors/records", headers=headers)
    assert rec_resp.status_code == 200
    assert isinstance(rec_resp.json(), list)


def test_06_visitor_cannot_access_inspector_audit_logs(client):
    """Verify visitor token cannot access certified inspector audit logs."""
    auth_resp = client.post("/api/v1/visitors/access", json={"username": "visitor"})
    token = auth_resp.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    logs_resp = client.get("/api/v1/visitors/logs", headers=headers)
    assert logs_resp.status_code in (401, 403), f"Expected 401/403, got {logs_resp.status_code}"


def test_07_inspector_can_view_visitor_activity_logs(client):
    """Verify authenticated inspector can retrieve chronological visitor activity logs."""
    # Login as default certified inspector
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "inspector@navy.mil",
        "password": "password123"
    })
    assert login_resp.status_code == 200, f"Inspector login failed: {login_resp.text}"
    insp_token = login_resp.json()["access_token"]

    headers = {"Authorization": f"Bearer {insp_token}"}
    logs_resp = client.get("/api/v1/visitors/logs", headers=headers)
    assert logs_resp.status_code == 200
    data = logs_resp.json()
    assert "logs" in data
    assert "total_count" in data
    assert data["total_count"] >= 6  # At least the 6 migrated legacy logs
    assert len(data["logs"]) > 0


def test_08_migrated_legacy_data_preserved_in_postgresql():
    """Verify that PostgreSQL contains all 5 legacy visitors and legacy access logs."""
    with Session(engine) as session:
        # Check visitors
        visitors = session.exec(select(Visitor)).all()
        visitor_map = {v.username: v for v in visitors}
        assert len(visitors) >= 5, f"Expected at least 5 visitors, found {len(visitors)}"
        for exp_user in ["visitor", "auditor", "defense_observer", "naval_cadet", "guest_evaluator"]:
            assert exp_user in visitor_map, f"Missing visitor '{exp_user}' in PostgreSQL"
            assert visitor_map[exp_user].is_active is True

        # Check access logs
        logs = session.exec(select(VisitorAccessLog).order_by(VisitorAccessLog.id)).all()
        assert len(logs) >= 6, f"Expected at least 6 migrated logs, found {len(logs)}"

        # Verify specific legacy sessions from SQLite migration
        session_ids = {l.session_id for l in logs}
        legacy_known_sessions = [
            "3cfbc316-3c74-4828-8750-168bcfab62c5",
            "92c8c39f-4439-4e1e-b36d-a83ed6c2d205",
            "6e150e90-67a7-4356-8647-00cda81ae2de",
            "628468f0-0451-4319-ae1c-5e37e3fc0e1e",
            "4b5b698f-5210-4f99-9ed8-c1d259d11cab",
            "f08045d7-edcc-4746-8489-05ed6747f845",
        ]
        for s_id in legacy_known_sessions:
            assert s_id in session_ids, f"Legacy session '{s_id}' missing from PostgreSQL"
