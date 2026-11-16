from typing import Generator
from sqlmodel import SQLModel, Session, text
from pathlib import Path

try:
    from app.db.session import engine, get_session, init_db, check_db_health
except ImportError:
    from .config import DATABASE_URL
    from sqlmodel import create_engine
    if "sqlite" in DATABASE_URL.lower():
        raise ValueError("SQLite is not supported. Project Dhatu Rakshana requires PostgreSQL.")
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        pool_pre_ping=True
    )

    def get_session() -> Generator[Session, None, None]:
        with Session(engine) as session:
            yield session

    def init_db() -> None:
        SQLModel.metadata.create_all(engine)

    def check_db_health() -> dict:
        try:
            with engine.connect() as connection:
                version_result = connection.execute(text("SELECT version();")).scalar()
                current_db = connection.execute(text("SELECT current_database();")).scalar()
                return {
                    "status": "connected",
                    "dialect": "postgresql",
                    "database": current_db,
                    "version": version_result
                }
        except Exception as exc:
            return {
                "status": "unhealthy",
                "dialect": "postgresql",
                "error": str(exc)
            }

def check_db_connection() -> dict:
    """Verify connectivity to database and return connection details."""
    res = check_db_health()
    return {
        "connected": res.get("status") == "connected",
        "database": res.get("database", "marine_defect_db"),
        "version": res.get("version", "unknown")
    }
