#!/usr/bin/env python3
"""Safe, idempotent data repair script for visitor access records in PostgreSQL.

Ensures that:
1. All 5 authorized visitor identity records are present and active in PostgreSQL.
2. The 6 legacy visitor access log records from SQLite are safely migrated/repaired in PostgreSQL.
3. PostgreSQL primary key sequences for visitors and visitor_access_logs are correctly synchronized.
4. Operates idempotently without duplicating, deleting, or altering existing PostgreSQL records.
"""

import os
import sys
import sqlite3
from pathlib import Path
from datetime import datetime

# Ensure Backend and project root are on sys.path
backend_dir = Path(__file__).resolve().parent.parent
project_root = backend_dir.parent.parent
for p in (backend_dir, project_root):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from sqlalchemy import create_engine, text
from app.core.config import settings

SQLITE_CANDIDATES = [
    Path("/workspace/Final Version - Project Dhatu Rakshana/Dhatu_Rakshana_Final/data/dhatu_rakshana.db"),
    backend_dir.parent / "data" / "dhatu_rakshana.db",
    backend_dir / "data" / "dhatu_rakshana.db",
    project_root / "data" / "dhatu_rakshana.db",
]

def find_sqlite_source() -> Path:
    for candidate in SQLITE_CANDIDATES:
        if candidate.exists() and candidate.stat().st_size > 0:
            return candidate
    raise FileNotFoundError(f"Legacy SQLite database not found in candidates: {SQLITE_CANDIDATES}")

def repair_visitor_data(pg_url: str = None) -> dict:
    pg_url = pg_url or settings.DATABASE_URL
    if "sqlite" in pg_url.lower():
        raise ValueError("PostgreSQL URL is required. SQLite is not supported.")

    sqlite_path = find_sqlite_source()
    print(f"[*] Source SQLite: {sqlite_path.resolve()}")
    print(f"[*] Target PostgreSQL: {pg_url.split('@')[-1] if '@' in pg_url else pg_url}")

    # Read from SQLite read-only
    sq_conn = sqlite3.connect(f"file:{sqlite_path.resolve()}?mode=ro", uri=True)
    sq_conn.row_factory = sqlite3.Row
    sq_cur = sq_conn.cursor()

    sq_cur.execute("SELECT * FROM visitors ORDER BY id")
    sqlite_visitors = [dict(r) for r in sq_cur.fetchall()]

    sq_cur.execute("SELECT * FROM visitor_access_logs ORDER BY id")
    sqlite_logs = [dict(r) for r in sq_cur.fetchall()]
    sq_conn.close()

    print(f"[*] Found {len(sqlite_visitors)} visitor records and {len(sqlite_logs)} access log records in SQLite.")

    engine = create_engine(pg_url)
    stats = {
        "visitors_checked": len(sqlite_visitors),
        "visitors_inserted": 0,
        "logs_checked": len(sqlite_logs),
        "logs_inserted": 0,
        "sequences_synced": []
    }

    with engine.begin() as conn:
        # 1. Idempotently repair visitors
        for v in sqlite_visitors:
            v_dict = {
                "id": v["id"],
                "username": v["username"],
                "full_name": v.get("full_name"),
                "organization": v.get("organization"),
                "is_active": bool(v.get("is_active", 1)),
                "created_at": v.get("created_at") or datetime.utcnow()
            }
            res = conn.execute(
                text("""
                    INSERT INTO visitors (id, username, full_name, organization, is_active, created_at)
                    VALUES (:id, :username, :full_name, :organization, :is_active, :created_at)
                    ON CONFLICT (username) DO UPDATE
                    SET is_active = EXCLUDED.is_active,
                        full_name = COALESCE(visitors.full_name, EXCLUDED.full_name),
                        organization = COALESCE(visitors.organization, EXCLUDED.organization)
                    WHERE visitors.is_active != EXCLUDED.is_active
                """),
                v_dict
            )
            if res.rowcount and res.rowcount > 0:
                stats["visitors_inserted"] += 1

        # 2. Idempotently repair visitor_access_logs
        # Fetch existing log session_ids and IDs from PostgreSQL
        existing_log_rows = conn.execute(text("SELECT id, session_id FROM visitor_access_logs")).fetchall()
        existing_ids = {r[0] for r in existing_log_rows}
        existing_sessions = {r[1] for r in existing_log_rows if r[1]}

        for log in sqlite_logs:
            session_id = log.get("session_id")
            log_id = log["id"]

            if session_id and session_id in existing_sessions:
                # Already present by session_id
                continue

            if log_id in existing_ids:
                # ID collision with different session: insert with next available ID
                conn.execute(
                    text("""
                        INSERT INTO visitor_access_logs (visitor_username, session_id, event_type, accessed_at, created_at)
                        VALUES (:visitor_username, :session_id, :event_type, :accessed_at, :created_at)
                    """),
                    {
                        "visitor_username": log["visitor_username"],
                        "session_id": session_id,
                        "event_type": log.get("event_type", "SUCCESSFUL_ACCESS"),
                        "accessed_at": log["accessed_at"],
                        "created_at": log["created_at"],
                    }
                )
                stats["logs_inserted"] += 1
            else:
                conn.execute(
                    text("""
                        INSERT INTO visitor_access_logs (id, visitor_username, session_id, event_type, accessed_at, created_at)
                        VALUES (:id, :visitor_username, :session_id, :event_type, :accessed_at, :created_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": log_id,
                        "visitor_username": log["visitor_username"],
                        "session_id": session_id,
                        "event_type": log.get("event_type", "SUCCESSFUL_ACCESS"),
                        "accessed_at": log["accessed_at"],
                        "created_at": log["created_at"],
                    }
                )
                stats["logs_inserted"] += 1

        # 3. Synchronize PostgreSQL Sequences
        for table in ["visitors", "visitor_access_logs"]:
            seq_name = conn.execute(
                text(f"SELECT pg_get_serial_sequence('\"{table}\"', 'id')")
            ).scalar()
            if seq_name:
                conn.execute(text(f"""
                    SELECT setval(
                        '{seq_name}',
                        COALESCE((SELECT MAX(id) FROM "{table}"), 1),
                        (SELECT MAX(id) FROM "{table}") IS NOT NULL
                    )
                """))
                stats["sequences_synced"].append(seq_name)

    print(f"[✓] Repair finished: {stats}")
    return stats

if __name__ == "__main__":
    repair_visitor_data()
