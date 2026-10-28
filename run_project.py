"""Entrypoint script to run Dhatu Rakshana (FastAPI backend + integrated React frontend)."""

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = PROJECT_ROOT / "Backend"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.chdir(PROJECT_ROOT)

if __name__ == "__main__":
    import uvicorn
    from app.core.config import settings

    print("=" * 70)
    print("   DHATU RAKSHANA (धातु रक्षण) - DEFENSE COATING INSPECTION SYSTEM")
    print("=" * 70)
    print(f" Database URL : {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    print(f" Backend API  : http://localhost:{settings.PORT}/api/v1")
    print(f" API Docs     : http://localhost:{settings.PORT}/docs")
    print(f" Web Frontend : http://localhost:{settings.PORT}/")
    print(f" Default User : inspector@navy.mil / password123")
    print("=" * 70)

    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
