import os
from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
from dotenv import load_dotenv

# Load env from backend folder or root
backend_env = Path(__file__).resolve().parent.parent / "backend" / ".env"
if backend_env.exists():
    load_dotenv(backend_env)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/marine_defect_db")

def init_engine():
    # If explicitly configured for SQLite
    if DATABASE_URL.startswith("sqlite"):
        return create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

    # Try connecting to PostgreSQL
    try:
        engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"[Database] Successfully connected to PostgreSQL: {DATABASE_URL}")
        return engine
    except Exception as exc:
        print(f"[Database Notice] PostgreSQL not active ({exc}). Falling back to local zero-config SQLite.")
        sqlite_file = Path(__file__).resolve().parent.parent / "marine_defects.db"
        sqlite_url = f"sqlite:///{sqlite_file}"
        return create_engine(sqlite_url, echo=False, connect_args={"check_same_thread": False})

engine = init_engine()

def init_db():
    from db.models import Zone, Inspection, Detection, GradedDefectRecord
    SQLModel.metadata.create_all(engine)
    print("[Database] Schema tables initialized.")

def get_session():
    with Session(engine) as session:
        yield session
