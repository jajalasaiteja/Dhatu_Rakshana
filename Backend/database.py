from typing import Generator
from sqlmodel import SQLModel, Session, text
from pathlib import Path

try:
    from app.db.session import engine, get_session, init_db, check_db_health
except ImportError:
    from .config import DATABASE_URL
    from sqlmodel import create_engine
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
    )

    def get_session() -> Generator[Session, None, None]:
        with Session(engine) as session:
            yield session

    def init_db() -> None:
        SQLModel.metadata.create_all(engine)

    def check_db_health() -> dict:
        with engine.connect() as connection:
            if engine.dialect.name == "sqlite":
                version_result = connection.execute(text("SELECT sqlite_version();")).scalar()
                current_db = "sqlite"
            else:
                version_result = connection.execute(text("SELECT version();")).scalar()
                current_db = connection.execute(text("SELECT current_database();")).scalar()
            return {
                "status": "connected",
                "dialect": engine.dialect.name,
                "database": current_db,
                "version": version_result
            }

def check_db_connection() -> dict:
    """Verify connectivity to database and return connection details."""
    res = check_db_health()
    return {
        "connected": res.get("status") == "connected",
        "database": res.get("database", res.get("dialect", "sqlite")),
        "version": res.get("version", "unknown")
    }
