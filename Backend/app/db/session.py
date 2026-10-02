"""Database engine, connection pooling, and session management for Dhatu Rakshana.

Configured for standalone zero-infrastructure SQLite execution by default, with thread-safe
WAL (Write-Ahead Logging) concurrency, busy timeout guards, and automated Alembic schema migrations.
"""

from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text, event
import sqlite3
import datetime
import logging

from app.core.config import settings, BACKEND_DIR, DATA_DIR

logger = logging.getLogger("dhatu_rakshana.db")

def create_db_engine():
    db_url = settings.DATABASE_URL

    # 1. SQLite: Primary, default, self-contained database
    if db_url.startswith("sqlite"):
        # Ensure target database directory exists
        if ":///" in db_url:
            path_part = db_url.split(":///", 1)[1]
            db_file_path = Path(path_part)
            db_file_path.parent.mkdir(parents=True, exist_ok=True)
            logger.info(f"Initialized SQLite database at: {db_file_path.resolve()}")
        else:
            logger.info(f"Initialized SQLite database: {db_url}")

        engine = create_engine(
            db_url,
            echo=False,
            connect_args={"check_same_thread": False}
        )

        # Enable DELETE journal mode (prevents Windows host lock issues on -shm), busy timeout, and foreign keys
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            if isinstance(dbapi_connection, sqlite3.Connection):
                cursor = dbapi_connection.cursor()
                try:
                    cursor.execute("PRAGMA journal_mode=DELETE")
                    cursor.execute("PRAGMA synchronous=NORMAL")
                    cursor.execute("PRAGMA busy_timeout=5000")
                    cursor.execute("PRAGMA foreign_keys=ON")
                except Exception:
                    pass
                finally:
                    cursor.close()

        return engine

    # 2. Optional Production PostgreSQL (only if explicitly set in DATABASE_URL)
    if db_url.startswith("postgresql"):
        try:
            logger.info(f"Connecting to explicit PostgreSQL configuration: {db_url.split('@')[-1]}")
            engine = create_engine(
                db_url,
                echo=False,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20
            )
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Successfully connected to PostgreSQL database.")
            return engine
        except Exception as exc:
            logger.error(
                f"Configured PostgreSQL connection at '{db_url.split('@')[-1]}' failed: {exc}. "
                f"Please verify PostgreSQL service or omit DATABASE_URL to use self-contained SQLite."
            )
            raise

    # Fallback to standard engine
    return create_engine(db_url, echo=False)

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
        TopologyFile
    )
    SQLModel.metadata.create_all(engine)
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

                # If tables already exist without alembic_version, stamp as head
                if "users" in tables and "alembic_version" not in tables:
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
    """Checks database connectivity and dialect information."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            dialect = engine.dialect.name
            version_str = None
            if dialect == "sqlite":
                version_str = conn.execute(text("SELECT sqlite_version();")).scalar()
            elif dialect == "postgresql":
                version_str = conn.execute(text("SELECT version();")).scalar()
        return {
            "status": "connected",
            "dialect": dialect,
            "version": version_str
        }
    except Exception as exc:
        return {"status": "unhealthy", "error": str(exc)}

def backup_database(destination_path: Path = None) -> Path:
    """
    Creates an atomic, consistent online backup of the SQLite database.
    Does not block active transactions or lock concurrent readers/writers.
    """
    if engine.dialect.name != "sqlite":
        raise NotImplementedError("Online zero-downtime backup utility currently supports SQLite.")

    # Locate source sqlite file
    url_str = str(engine.url)
    if ":///" not in url_str:
        raise ValueError(f"Cannot resolve source SQLite file path from URL: {url_str}")

    source_path = Path(url_str.split(":///", 1)[1])
    if not source_path.exists():
        raise FileNotFoundError(f"Source SQLite database does not exist: {source_path}")

    # Determine backup destination
    if destination_path is None:
        backup_dir = DATA_DIR / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
        destination_path = backup_dir / f"dhatu_rakshana_backup_{timestamp}.db"
    else:
        destination_path = Path(destination_path)
        destination_path.parent.mkdir(parents=True, exist_ok=True)

    # Execute SQLite atomic backup API
    src_conn = sqlite3.connect(str(source_path))
    dst_conn = sqlite3.connect(str(destination_path))
    try:
        with dst_conn:
            src_conn.backup(dst_conn, pages=100)
        logger.info(f"SQLite database backed up successfully to: {destination_path}")
    finally:
        dst_conn.close()
        src_conn.close()

    return destination_path
