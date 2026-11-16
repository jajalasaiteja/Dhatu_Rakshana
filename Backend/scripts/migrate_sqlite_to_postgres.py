#!/usr/bin/env python3
"""Safe, non-destructive migration script from legacy SQLite database to PostgreSQL.

Usage:
    python -m scripts.migrate_sqlite_to_postgres [--sqlite-path PATH] [--pg-url URL] [--dry-run]
"""

import argparse
import os
import sqlite3
import sys
from pathlib import Path
from typing import Dict, List, Any

# Ensure Backend and project root are on sys.path
backend_dir = Path(__file__).resolve().parent.parent
project_root = backend_dir.parent.parent
for p in (backend_dir, project_root):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import OperationalError

# Order of tables ensuring foreign keys are satisfied
TABLE_MIGRATION_ORDER = [
    "users",
    "visitors",
    "visitor_access_logs",
    "zones",
    "model_versions",
    "inspections",
    "inspection_images",
    "processing_jobs",
    "processing_artifacts",
    "topology_files",
    "detections",
    "defect_measurements",
    "graded_defect_records",
    "inspection_measurements",
    "evaluation_histories",
    "inspection_reports",
]


def parse_args():
    parser = argparse.ArgumentParser(description="Migrate Dhatu Rakshana SQLite data to PostgreSQL.")
    parser.add_argument(
        "--sqlite-path",
        default=None,
        help="Path to source SQLite database file (defaults to auto-detected data/dhatu_rakshana.db)",
    )
    parser.add_argument(
        "--pg-url",
        default=None,
        help="Target PostgreSQL connection URL (defaults to DATABASE_URL in config / env)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Inspect SQLite records and print migration summary without altering PostgreSQL",
    )
    return parser.parse_args()


def resolve_sqlite_path(custom_path: str = None) -> Path:
    if custom_path:
        return Path(custom_path)
    candidates = [
        Path("/workspace/Final Version - Project Dhatu Rakshana/Dhatu_Rakshana_Final/data/dhatu_rakshana.db"),
        backend_dir.parent / "data" / "dhatu_rakshana.db",
        backend_dir / "data" / "dhatu_rakshana.db",
        project_root / "data" / "dhatu_rakshana.db",
        Path("data/dhatu_rakshana.db"),
        Path("../data/dhatu_rakshana.db"),
        Path("../../data/dhatu_rakshana.db"),
        Path("/workspace/data/dhatu_rakshana.db"),
    ]
    for c in candidates:
        if c.exists() and c.stat().st_size > 0:
            return c
    return candidates[0]


def get_sqlite_tables_and_counts(sqlite_path: Path) -> Dict[str, int]:
    """Inspect SQLite database in read-only mode and return record counts."""
    # URI read-only connection
    uri = f"file:{sqlite_path.resolve()}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get available tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = {row[0] for row in cursor.fetchall()}

    counts = {}
    for table in TABLE_MIGRATION_ORDER:
        if table in existing_tables:
            cursor.execute(f'SELECT COUNT(*) FROM "{table}";')
            counts[table] = cursor.fetchone()[0]
        else:
            counts[table] = 0

    conn.close()
    return counts


def migrate_table(sqlite_conn: sqlite3.Connection, pg_conn, table_name: str, dry_run: bool) -> int:
    """Read rows from SQLite and insert into PostgreSQL."""
    sqlite_cur = sqlite_conn.cursor()
    sqlite_cur.execute(f'SELECT * FROM "{table_name}";')
    rows = sqlite_cur.fetchall()
    if not rows:
        return 0

    columns = [desc[0] for desc in sqlite_cur.description]
    col_str = ", ".join([f'"{col}"' for col in columns])
    placeholder_str = ", ".join([f":{col}" for col in columns])

    if dry_run:
        return len(rows)

    # Introspect PostgreSQL column types for safe type casting (e.g. SQLite integer -> PG boolean)
    try:
        inspector = inspect(pg_conn)
        col_types = {c["name"]: type(c["type"]).__name__.lower() for c in inspector.get_columns(table_name)}
    except Exception:
        col_types = {}

    insert_stmt = text(f'INSERT INTO "{table_name}" ({col_str}) VALUES ({placeholder_str}) ON CONFLICT DO NOTHING')

    migrated_count = 0
    for row in rows:
        row_dict = dict(row)
        for k, v in row_dict.items():
            ctype = col_types.get(k, "")
            if "boolean" in ctype and v is not None:
                row_dict[k] = bool(v)
        res = pg_conn.execute(insert_stmt, row_dict)
        if res.rowcount and res.rowcount > 0:
            migrated_count += 1

    return migrated_count


def sync_postgres_sequences(pg_conn, table_name: str):
    """Update PostgreSQL serial/identity sequences to match maximum existing IDs."""
    try:
        # Check if table has 'id' column
        seq_query = text(f"""
            SELECT pg_get_serial_sequence('"{table_name}"', 'id');
        """)
        seq_name = pg_conn.execute(seq_query).scalar()
        if seq_name:
            sync_query = text(f"""
                SELECT setval('{seq_name}', COALESCE((SELECT MAX(id) FROM "{table_name}"), 1), (SELECT MAX(id) FROM "{table_name}") IS NOT NULL);
            """)
            pg_conn.execute(sync_query)
    except Exception as e:
        # Fallback to standard convention <table_name>_id_seq if pg_get_serial_sequence is null
        try:
            pg_conn.execute(text(f"""
                SELECT setval('"{table_name}_id_seq"', COALESCE((SELECT MAX(id) FROM "{table_name}"), 1), (SELECT MAX(id) FROM "{table_name}") IS NOT NULL);
            """))
        except Exception:
            pass


def main():
    args = parse_args()
    sqlite_path = resolve_sqlite_path(args.sqlite_path)

    print("=" * 65)
    print("  DHATU RAKSHANA - SQLITE TO POSTGRESQL DATA MIGRATION UTILITY")
    print("=" * 65)

    if not sqlite_path.exists():
        print(f"[!] SQLite source database not found at '{sqlite_path.resolve()}'.")
        print("    If starting fresh, database tables will be initialized in PostgreSQL.")
        return 0

    print(f"[*] Source SQLite:      {sqlite_path.resolve()} (Preserved read-only)")

    # Read SQLite record summary
    counts = get_sqlite_tables_and_counts(sqlite_path)
    print("\n[*] SQLite Record Inventory:")
    total_source_records = sum(counts.values())
    for tbl, cnt in counts.items():
        if cnt > 0:
            print(f"    - {tbl:<25}: {cnt} records")
    print(f"    Total Records: {total_source_records}")

    if args.dry_run:
        print("\n[✓] Dry-run completed. No changes written to PostgreSQL.")
        return 0

    # Resolve target PostgreSQL URL
    pg_url = args.pg_url
    if not pg_url:
        from app.core.config import settings
        pg_url = settings.DATABASE_URL

    if "sqlite" in pg_url.lower():
        print("[!] Target database URL is SQLite. PostgreSQL URL required.")
        return 1

    print(f"[*] Target PostgreSQL:  {pg_url}")
    print("\n[*] Verifying PostgreSQL connection...")

    try:
        pg_engine = create_engine(pg_url)
        with pg_engine.connect() as conn:
            version = conn.execute(text("SELECT version();")).scalar()
            print(f"    [OK] Connected to PostgreSQL: {version.split(',')[0]}")
    except OperationalError as oe:
        print(f"\n[!] ERROR: Could not connect to PostgreSQL server.")
        print(f"    Details: {oe}")
        print("\n[*] Setup Steps Required to Connect to PostgreSQL:")
        print("    1. Start PostgreSQL via Docker Compose:")
        print("       docker compose up -d postgres")
        print("    2. Or ensure a local/remote PostgreSQL instance is running on port 5432.")
        print("    3. Check DATABASE_URL in .env matches your PostgreSQL credentials.")
        return 1

    # Connect to SQLite for streaming records
    uri = f"file:{sqlite_path.resolve()}?mode=ro"
    sqlite_conn = sqlite3.connect(uri, uri=True)
    sqlite_conn.row_factory = sqlite3.Row

    print("\n[*] Migrating tables to PostgreSQL...")
    with pg_engine.begin() as pg_conn:
        # Check existing target tables
        inspector = inspect(pg_engine)
        pg_tables = set(inspector.get_table_names())

        migrated_totals = 0
        for table in TABLE_MIGRATION_ORDER:
            if table not in pg_tables:
                print(f"    - Table '{table}' does not exist in target PostgreSQL schema. Skipping.")
                continue

            if counts.get(table, 0) == 0:
                continue

            count = migrate_table(sqlite_conn, pg_conn, table, dry_run=False)
            sync_postgres_sequences(pg_conn, table)
            migrated_totals += count
            print(f"    - Migrated table '{table}': {count} new records transferred")

    sqlite_conn.close()

    print(f"\n[✓] Migration complete! Total records transferred: {migrated_totals}")
    print(f"    Original SQLite file '{sqlite_path}' remains untouched.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
