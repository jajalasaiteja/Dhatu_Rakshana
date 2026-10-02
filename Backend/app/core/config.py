"""Centralized configuration management for Dhatu Rakshana using dotenv & Pydantic.

Supports standalone zero-infrastructure SQLite execution, portable pathlib path resolution,
and self-contained local storage and ML inference.
"""

import os
from pathlib import Path
from typing import List, Union, Optional
import json
from dotenv import load_dotenv

# 1. Deterministic Project-Root & Path Resolution
def find_project_root() -> Path:
    """Recursively locates repository root containing project markers or scripts."""
    current = Path(__file__).resolve().parent
    for candidate in [current] + list(current.parents):
        if (candidate / "requirements.txt").exists() and (
            (candidate / "Project Dhatu Rakshana").exists() or (candidate / "Backend").exists()
        ):
            return candidate
        if (candidate / "run.ps1").exists() or (candidate / "run.sh").exists():
            return candidate
    # Fallback based on relative directory hierarchy
    backend_dir = Path(__file__).resolve().parent.parent.parent
    if backend_dir.parent.name == "Project Dhatu Rakshana":
        return backend_dir.parent.parent
    return backend_dir.parent

PROJECT_ROOT = find_project_root()
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

# Check for Frontend directories
FRONTEND_DIR = PROJECT_ROOT / "Project Dhatu Rakshana" / "Frontend"
if not FRONTEND_DIR.exists():
    FRONTEND_DIR = PROJECT_ROOT / "Frontend"

FRONTEND_DIST = FRONTEND_DIR / "dist"

# Local Data and Storage directories (created automatically on access)
DATA_DIR = Path(os.getenv("DATA_DIR", str(PROJECT_ROOT / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)

STORAGE_DIR = Path(os.getenv("STORAGE_DIR", str(PROJECT_ROOT / "storage")))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

MODELS_DIR = Path(os.getenv("MODELS_DIR", str(PROJECT_ROOT / "models")))
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# 3D Micro-Topography PLY Storage Directory
raw_topo_dir = os.getenv("TOPOLOGY_STORAGE_DIR", "storage/topology")
if Path(raw_topo_dir).is_absolute():
    TOPOLOGY_STORAGE_DIR = Path(raw_topo_dir)
else:
    TOPOLOGY_STORAGE_DIR = (PROJECT_ROOT / raw_topo_dir).resolve()
TOPOLOGY_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Config path resolution
DEFAULT_CONFIG_DIR = BACKEND_DIR / "config"
if not DEFAULT_CONFIG_DIR.exists() and (PROJECT_ROOT / "config").exists():
    DEFAULT_CONFIG_DIR = PROJECT_ROOT / "config"

DEFAULT_SQLITE_PATH = DATA_DIR / "dhatu_rakshana.db"

def resolve_db_url(raw_url: Optional[str] = None) -> str:
    """Resolves database URL to an absolute, cross-platform SQLite URL if default or relative."""
    env_url = raw_url or os.getenv("DATABASE_URL")
    if not env_url or env_url.strip() == "":
        return f"sqlite:///{DEFAULT_SQLITE_PATH.resolve().as_posix()}"
    
    # If explicitly sqlite relative path e.g. sqlite:///./data/... or sqlite:///data/...
    if env_url.startswith("sqlite:///./") or env_url.startswith("sqlite:///.\\"):
        rel_path = env_url[len("sqlite:///./"):]
        abs_db = (PROJECT_ROOT / rel_path).resolve()
        abs_db.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{abs_db.as_posix()}"
    
    if env_url.startswith("sqlite:///") and not env_url.startswith("sqlite:////") and not (len(env_url) > 11 and env_url[10] == ":"):
        # Relative sqlite path without dot, e.g. sqlite:///data/dhatu_rakshana.db
        candidate_rel = env_url[len("sqlite:///"):]
        if not Path(candidate_rel).is_absolute():
            abs_db = (PROJECT_ROOT / candidate_rel).resolve()
            abs_db.parent.mkdir(parents=True, exist_ok=True)
            return f"sqlite:///{abs_db.as_posix()}"

    return env_url

# Load environment variables (from Backend/.env, root .env, or system)
for env_path in [BACKEND_DIR / ".env", PROJECT_ROOT / ".env"]:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=False)

RESOLVED_DATABASE_URL = resolve_db_url()

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from pydantic import model_validator

    class Settings(BaseSettings):
        model_config = SettingsConfigDict(
            env_file=str(BACKEND_DIR / ".env") if (BACKEND_DIR / ".env").exists() else None,
            env_file_encoding="utf-8",
            extra="ignore"
        )

        APP_NAME: str = os.getenv("APP_NAME", "Dhatu Rakshana")
        APP_ENV: str = os.getenv("APP_ENV", "development")
        DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1")
        LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

        HOST: str = os.getenv("HOST", "0.0.0.0")
        PORT: int = int(os.getenv("PORT", "8000"))
        API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")

        # Database: Default to portable SQLite in data/
        DATABASE_URL: str = RESOLVED_DATABASE_URL
        SQLITE_FALLBACK_FILE: str = str(DEFAULT_SQLITE_PATH)

        # Security
        SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "dhatu-rakshana-secure-jwt-secret-key-change-in-production-2026"))
        JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "dhatu-rakshana-secure-jwt-secret-key-change-in-production-2026"))
        JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
        ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

        # Storage
        STORAGE_BACKEND: str = os.getenv("STORAGE_BACKEND", "local")
        STORAGE_DIR: str = str(STORAGE_DIR)
        STORAGE_BUCKET: str = os.getenv("STORAGE_BUCKET", "marine-inspections")
        TOPOLOGY_STORAGE_DIR: str = str(TOPOLOGY_STORAGE_DIR)

        # Config paths
        CONFIG_DIR: str = os.getenv("CONFIG_DIR", str(DEFAULT_CONFIG_DIR))
        GRADING_CONFIG_PATH: str = os.getenv("GRADING_CONFIG_PATH", str(DEFAULT_CONFIG_DIR / "grading_thresholds.yaml"))
        MODEL_CONFIG_PATH: str = os.getenv("MODEL_CONFIG_PATH", str(DEFAULT_CONFIG_DIR / "model_config.yaml"))

        # ML / Vision
        ML_DEVICE: str = os.getenv("ML_DEVICE", "auto")
        DEFAULT_MODEL_NAME: str = os.getenv("DEFAULT_MODEL_NAME", "marine_hybrid_v1")
        CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.45"))
        MAX_IMAGE_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_IMAGE_UPLOAD_SIZE_MB", "50"))
        MAX_IMAGES_PER_INSPECTION: int = int(os.getenv("MAX_IMAGES_PER_INSPECTION", "20"))
        RECONSTRUCTION_MAX_DIM: int = int(os.getenv("RECONSTRUCTION_MAX_DIM", "220"))

        # Reporting
        REPORT_TITLE: str = os.getenv("REPORT_TITLE", "DEFENSE PLATFORM COATING DEFECT INSPECTION AUDIT REPORT")
        ORGANIZATION: str = os.getenv("ORGANIZATION", "DEFENSE MARINE COATING STANDARDS AUTHORITY")

        # CORS
        CORS_ORIGINS: List[str] = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000"
        ]

        @model_validator(mode="after")
        def _resolve_paths(self):
            self.DATABASE_URL = resolve_db_url(self.DATABASE_URL)
            if not Path(self.STORAGE_DIR).is_absolute():
                self.STORAGE_DIR = str((PROJECT_ROOT / self.STORAGE_DIR).resolve())
            if not Path(self.TOPOLOGY_STORAGE_DIR).is_absolute():
                self.TOPOLOGY_STORAGE_DIR = str((PROJECT_ROOT / self.TOPOLOGY_STORAGE_DIR).resolve())
            return self

    settings = Settings()

except ImportError:
    from pydantic import BaseModel, model_validator

    class Settings(BaseModel):
        APP_NAME: str = os.getenv("APP_NAME", "Dhatu Rakshana")
        APP_ENV: str = os.getenv("APP_ENV", "development")
        DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1")
        LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

        HOST: str = os.getenv("HOST", "0.0.0.0")
        PORT: int = int(os.getenv("PORT", "8000"))
        API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")

        DATABASE_URL: str = RESOLVED_DATABASE_URL
        SQLITE_FALLBACK_FILE: str = str(DEFAULT_SQLITE_PATH)

        SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "dhatu-rakshana-secure-jwt-secret-key-change-in-production-2026"))
        JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "dhatu-rakshana-secure-jwt-secret-key-change-in-production-2026"))
        JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
        ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

        STORAGE_BACKEND: str = os.getenv("STORAGE_BACKEND", "local")
        STORAGE_DIR: str = str(STORAGE_DIR)
        STORAGE_BUCKET: str = os.getenv("STORAGE_BUCKET", "marine-inspections")
        TOPOLOGY_STORAGE_DIR: str = str(TOPOLOGY_STORAGE_DIR)

        CONFIG_DIR: str = os.getenv("CONFIG_DIR", str(DEFAULT_CONFIG_DIR))
        GRADING_CONFIG_PATH: str = os.getenv("GRADING_CONFIG_PATH", str(DEFAULT_CONFIG_DIR / "grading_thresholds.yaml"))
        MODEL_CONFIG_PATH: str = os.getenv("MODEL_CONFIG_PATH", str(DEFAULT_CONFIG_DIR / "model_config.yaml"))

        ML_DEVICE: str = os.getenv("ML_DEVICE", "auto")
        DEFAULT_MODEL_NAME: str = os.getenv("DEFAULT_MODEL_NAME", "marine_hybrid_v1")
        CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.45"))
        MAX_IMAGE_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_IMAGE_UPLOAD_SIZE_MB", "50"))
        MAX_IMAGES_PER_INSPECTION: int = int(os.getenv("MAX_IMAGES_PER_INSPECTION", "20"))
        RECONSTRUCTION_MAX_DIM: int = int(os.getenv("RECONSTRUCTION_MAX_DIM", "220"))

        REPORT_TITLE: str = os.getenv("REPORT_TITLE", "DEFENSE PLATFORM COATING DEFECT INSPECTION AUDIT REPORT")
        ORGANIZATION: str = os.getenv("ORGANIZATION", "DEFENSE MARINE COATING STANDARDS AUTHORITY")

        CORS_ORIGINS: List[str] = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000"
        ]

        @model_validator(mode="after")
        def _resolve_paths(self):
            self.DATABASE_URL = resolve_db_url(self.DATABASE_URL)
            if not Path(self.STORAGE_DIR).is_absolute():
                self.STORAGE_DIR = str((PROJECT_ROOT / self.STORAGE_DIR).resolve())
            if not Path(self.TOPOLOGY_STORAGE_DIR).is_absolute():
                self.TOPOLOGY_STORAGE_DIR = str((PROJECT_ROOT / self.TOPOLOGY_STORAGE_DIR).resolve())
            return self

    settings = Settings()
