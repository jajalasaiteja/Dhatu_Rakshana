import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

STORAGE_DIR = Path(os.getenv("STORAGE_DIR", str(BASE_DIR / "storage"))).resolve()
GRADING_CONFIG_PATH = Path(os.getenv("GRADING_CONFIG_PATH", str(BASE_DIR / "config" / "grading_thresholds.yaml"))).resolve()
CORS_ORIGINS = [orig.strip() for orig in os.getenv("CORS_ORIGINS", "*").split(",") if orig.strip()]
