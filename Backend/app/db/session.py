"""Database engine, connection pooling, and session management for Dhatu Rakshana.

Configured strictly for PostgreSQL with connection pooling, pool pre-ping,
and automated Alembic schema migrations. SQLite is not supported.
"""

from pathlib import Path
from typing import Optional
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
import subprocess
import shutil
import datetime
import logging

from app.core.config import settings, BACKEND_DIR, DATA_DIR

logger = logging.getLogger("dhatu_rakshana.db")

def create_db_engine(db_url: Optional[str] = None):
    url = db_url or settings.DATABASE_URL

    if not url or "sqlite" in url.lower():
        raise ValueError(
            "SQLite is not supported. Project Dhatu Rakshana requires PostgreSQL as its only database. "
            f"Configured URL was '{url}'. "
            "Please configure a valid PostgreSQL connection (e.g. postgresql+psycopg2://<user>:<password>@<host>:<port>/<dbname>)."
        )

    if not (url.startswith("postgresql") or url.startswith("postgres")):
        raise ValueError(
            f"Unsupported database scheme in DATABASE_URL: {url.split('://')[0]}. "
            "Only PostgreSQL is supported."
        )

    logger.info(f"Configuring PostgreSQL database connection: {url.split('@')[-1] if '@' in url else url}")
    engine = create_engine(
        url,
        echo=False,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600
    )
    return engine

engine = create_db_engine()

def get_session():
    """FastAPI dependency for yielding database session with automatic transaction management."""
    with Session(engine) as session:
        yield session

def init_db():
    """Initializes tables for all SQLModel definitions."""
    from app.models import (
        User,
        Zone,
        ModelVersion,
        Inspection,
        InspectionImage,
        Detection,
        DefectMeasurement,
        GradedDefectRecord,
        ProcessingJob,
        ProcessingArtifact,
        InspectionReport,
        TopologyFile,
        Visitor,
        VisitorAccessLog
    )
    SQLModel.metadata.create_all(engine)
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE inspections ADD COLUMN operation_mode VARCHAR(50) DEFAULT 'balanced'"))
            conn.commit()
    except Exception:
        pass
    logger.info("Database schema verified and tables initialized via SQLModel metadata.")

def run_migrations():
    """Runs Alembic migrations up to head revision, with safe fallback to SQLModel metadata."""
    alembic_ini = BACKEND_DIR / "alembic.ini"
    alembic_folder = BACKEND_DIR / "alembic"

    if alembic_ini.exists() and alembic_folder.exists():
        try:
            from alembic.config import Config
            from alembic import command
            from sqlalchemy import inspect

            alembic_cfg = Config(str(alembic_ini))
            alembic_cfg.set_main_option("script_location", str(alembic_folder))
            alembic_cfg.set_main_option("sqlalchemy.url", str(engine.url))

            with engine.connect() as conn:
                inspector = inspect(conn)
                tables = inspector.get_table_names()
                has_users = "users" in tables
                has_alembic = "alembic_version" in tables

            # Execute alembic commands outside of active connection context to prevent nested locks on SQLite
            if has_users and not has_alembic:
                command.stamp(alembic_cfg, "head")
                logger.info("Existing database schema stamped with current Alembic revision.")
            else:
                command.upgrade(alembic_cfg, "head")
                logger.info("Database schema migrated to latest Alembic revision.")
            return
        except Exception as exc:
            logger.warning(f"Alembic migration encountered notice: {exc}. Ensuring schema via SQLModel create_all...")

    # Fallback / ensure all tables
    init_db()

def check_db_health() -> dict:
    """Checks PostgreSQL database connectivity and version information."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            version_str = conn.execute(text("SELECT version();")).scalar()
            current_db = conn.execute(text("SELECT current_database();")).scalar()
        return {
            "status": "connected",
            "dialect": "postgresql",
            "database": current_db,
            "version": version_str
        }
    except Exception as exc:
        return {
            "status": "unhealthy",
            "dialect": "postgresql",
            "error": str(exc)
        }

def backup_database(destination_path: Path = None) -> Path:
    """
    Creates a backup of the PostgreSQL database using pg_dump if available.
    """
    backup_dir = DATA_DIR / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    from app.core.timezone import get_ist_now
    timestamp = get_ist_now().strftime("%Y%m%d_%H%M%S_IST")

    if destination_path is None:
        destination_path = backup_dir / f"dhatu_rakshana_backup_{timestamp}.sql"
    else:
        destination_path = Path(destination_path)
        destination_path.parent.mkdir(parents=True, exist_ok=True)

    pg_dump_bin = shutil.which("pg_dump")
    if not pg_dump_bin:
        raise RuntimeError(
            "pg_dump utility not found on system PATH. To back up PostgreSQL database, "
            "install postgresql-client tools or execute backup via Docker: "
            f"'docker exec dhatu_postgres pg_dump -U postgres marine_defect_db > {destination_path}'"
        )

    db_url = str(engine.url)
    cmd = [pg_dump_bin, db_url, "-f", str(destination_path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"PostgreSQL backup failed: {result.stderr}")

    logger.info(f"PostgreSQL database backed up successfully to: {destination_path}")
    return destination_path
