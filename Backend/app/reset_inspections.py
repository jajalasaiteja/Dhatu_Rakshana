"""CLI script to reset all inspection records and associated files safely."""

import os
import shutil
import sqlite3
from pathlib import Path
from app.core.config import settings

def reset_inspections() -> None:
    print("=" * 60)
    print("  DHATU RAKSHANA - RESET ALL INSPECTION RECORDS")
    print("=" * 60)

    # Determine database path
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
    else:
        db_path = "data/dhatu_rakshana.db"

    abs_db_path = Path(db_path).resolve()
    print(f"[*] Target SQLite Database: {abs_db_path}")

    if not abs_db_path.exists():
        print(f"[!] Database file not found at {abs_db_path}. Nothing to reset.")
        return

    conn = sqlite3.connect(str(abs_db_path))
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON;")

    tables_to_clear = [
        "graded_defect_records",
        "defect_measurements",
        "inspection_measurements",
        "evaluation_histories",
        "detections",
        "inspection_reports",
        "processing_artifacts",
        "processing_jobs",
        "topology_files",
        "inspection_images",
        "inspections"
    ]

    print("\n[*] Purging inspection records from database...")
    total_deleted = 0
    for table in tables_to_clear:
        try:
            cur.execute(f'DELETE FROM "{table}"')
            count = cur.rowcount
            total_deleted += count
            print(f"  - Cleared table '{table}': {count} records removed")
        except sqlite3.OperationalError as e:
            print(f"  - Table '{table}' skipped ({e})")

    conn.commit()
    print(f"[*] Total records removed: {total_deleted}")

    # Reset SQLite sequence counter for inspection tables safely (preserving users, visitors, zones, etc.)
    try:
        cur.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'")
        if cur.fetchone():
            cur.execute("""
                DELETE FROM sqlite_sequence 
                WHERE name IN (
                    'inspections', 'inspection_images', 'processing_jobs', 
                    'processing_artifacts', 'inspection_reports', 'topology_files', 
                    'detections', 'defect_measurements', 'graded_defect_records', 
                    'inspection_measurements', 'evaluation_histories'
                )
            """)
            conn.commit()
            print("  - Reset sqlite_sequence for inspection tables (preserved user and system sequences)")
    except sqlite3.OperationalError as e:
        print(f"  - sqlite_sequence reset skipped ({e})")

    print("[*] Verifying SQLite foreign keys and integrity...")
    fk_violations = cur.execute("PRAGMA foreign_key_check;").fetchall()
    if fk_violations:
        print(f"[!] Warning: Foreign key check failed with violations: {fk_violations}")
    else:
        print("  - PRAGMA foreign_key_check: OK (0 violations)")

    integrity = cur.execute("PRAGMA integrity_check;").fetchall()
    print(f"  - PRAGMA integrity_check: {integrity[0][0] if integrity else 'unknown'}")

    print("[*] Running SQLite VACUUM optimization...")
    cur.execute("VACUUM;")
    conn.close()

    # Storage cleanup
    # Identify storage root: check settings, environment, or relative paths
    candidate_roots = [
        Path(settings.STORAGE_DIR).resolve(),
        Path(settings.PROJECT_ROOT / "storage").resolve() if hasattr(settings, "PROJECT_ROOT") else None,
        Path("storage").resolve(),
        Path("/workspace/storage").resolve()
    ]
    seen_roots = set()
    storage_roots = []
    for cr in candidate_roots:
        if cr and cr.exists() and str(cr) not in seen_roots:
            storage_roots.append(cr)
            seen_roots.add(str(cr))

    topology_dir = Path(settings.TOPOLOGY_STORAGE_DIR).resolve() if hasattr(settings, "TOPOLOGY_STORAGE_DIR") else Path("/workspace/storage/topology").resolve()

    print("\n[*] Purging physical storage files...")
    cleaned_files = 0

    for sroot in storage_roots:
        cleanup_dirs = [
            topology_dir,
            sroot / "buckets" / "marine-inspections" / "images",
            sroot / "buckets" / "marine-inspections" / "meshes",
            sroot / "buckets" / "marine-inspections" / "reports",
            sroot / "inspections",
            sroot / "temporary"
        ]
        for sdir in cleanup_dirs:
            if sdir.exists():
                for item in sdir.iterdir():
                    if item.name == ".gitkeep":
                        continue
                    try:
                        if item.is_file() or item.is_symlink():
                            item.unlink()
                            cleaned_files += 1
                        elif item.is_dir():
                            files_in_dir = sum(1 for p in item.rglob("*") if p.is_file())
                            shutil.rmtree(item)
                            cleaned_files += files_in_dir
                    except Exception as ex:
                        print(f"  [!] Failed to delete {item}: {ex}")
            else:
                sdir.mkdir(parents=True, exist_ok=True)

    # Ensure .gitkeep in topology directory
    gitkeep = topology_dir / ".gitkeep"
    if not gitkeep.exists():
        topology_dir.mkdir(parents=True, exist_ok=True)
        gitkeep.touch()

    print(f"[*] Physical storage cleaned. Removed {cleaned_files} items.")
    print("\n[✓] All inspection records and associated files have been successfully reset.")

def main():
    reset_inspections()

if __name__ == "__main__":
    main()
