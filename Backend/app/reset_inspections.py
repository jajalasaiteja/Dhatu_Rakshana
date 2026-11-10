"""CLI script to reset all inspection records and associated files safely in PostgreSQL."""

import os
import shutil
from pathlib import Path
from sqlalchemy import text
from app.core.config import settings
from app.db.session import engine

def reset_inspections() -> None:
    print("=" * 60)
    print("  DHATU RAKSHANA - RESET ALL INSPECTION RECORDS")
    print("=" * 60)

    print(f"[*] Target PostgreSQL Database: {settings.DATABASE_URL}")

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

    print("\n[*] Purging inspection records from PostgreSQL database...")
    total_deleted = 0
    with engine.begin() as conn:
        for table in tables_to_clear:
            try:
                res = conn.execute(text(f'DELETE FROM "{table}"'))
                count = res.rowcount if res.rowcount is not None and res.rowcount >= 0 else 0
                total_deleted += count
                print(f"  - Cleared table '{table}': {count} records removed")
            except Exception as e:
                print(f"  - Table '{table}' skipped ({e})")

        print(f"[*] Total records removed: {total_deleted}")

        # Reset PostgreSQL sequence counters for inspection tables safely
        print("[*] Resetting sequence counters...")
        for table in tables_to_clear:
            seq_name = f"{table}_id_seq"
            try:
                conn.execute(text(f'ALTER SEQUENCE IF EXISTS "{seq_name}" RESTART WITH 1'))
                print(f"  - Reset sequence '{seq_name}' to 1")
            except Exception as e:
                print(f"  - Sequence '{seq_name}' reset skipped ({e})")

    # Storage cleanup
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
