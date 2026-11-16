import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory for the backend package
BASE_DIR = Path(__file__).resolve().parent

try:
    from app.core.config import (
        settings,
        PROJECT_ROOT,
        DATA_DIR,
        STORAGE_DIR,
        RESOLVED_DATABASE_URL as DATABASE_URL,
        APP_NAME,
        APP_ENV,
        DEBUG,
    )
    CORS_ORIGINS = settings.CORS_ORIGINS
except ImportError:
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        load_dotenv(dotenv_path=env_file)
    else:
        load_dotenv()

    PROJECT_ROOT = BASE_DIR.parent
    DATA_DIR = PROJECT_ROOT / "data"
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STORAGE_DIR = PROJECT_ROOT / "storage"
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    raw_db = os.getenv("DATABASE_URL")
    if raw_db and "sqlite" in raw_db.lower():
        raise ValueError("SQLite is not supported. Project Dhatu Rakshana requires PostgreSQL.")
    DATABASE_URL = raw_db or f"postgresql+psycopg2://{os.getenv('POSTGRES_USER', 'postgres')}:{os.getenv('POSTGRES_PASSWORD', 'postgrespassword')}@{os.getenv('POSTGRES_HOST', 'localhost')}:{os.getenv('POSTGRES_PORT', '5432')}/{os.getenv('POSTGRES_DB', 'marine_defect_db')}"
    APP_NAME = os.getenv("APP_NAME", "Project Dhatu Rakshana API")
    APP_ENV = os.getenv("APP_ENV", "development")
    DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000"
    ).split(",")
