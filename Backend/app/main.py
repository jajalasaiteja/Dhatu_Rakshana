"""Dhatu Rakshana (धातु रक्षण) - Production Backend Application Entrypoint.

AI-Powered Marine Platform Coating Defect Inspection & 3D Topography Analysis Platform.
Self-contained, standalone architecture with local SQLite database, local artifact storage,
in-process ML/CV inference, and integrated React SPA serving.
"""

import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings, FRONTEND_DIST
from app.core.logging import setup_logging, logger
from app.core.exceptions import DhatuRakshanaError, dhatu_exception_handler
from app.db.session import run_migrations, init_db, backup_database
from app.db.seed import seed_database
from app.storage.local import storage
from app.ml.registry import model_registry

# Import Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.inspections import router as inspections_router
from app.api.v1.zones import router as zones_router
from app.api.v1.models import router as models_router
from app.api.v1.artifacts import router as artifacts_router
from app.api.v1.health import router as health_router
from app.api.v1.topology import router as topology_router

setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: initializes database, seeds reference data, and preheats ML registry."""
    logger.info(f"Starting {settings.APP_NAME} Backend ({settings.APP_ENV})...")
    try:
        # Run automated migrations to ensure SQLite schema is at latest revision
        run_migrations()
        seed_database()

        # Pre-warm default ML model in background so first inspection is instantaneous
        default_model = model_registry.get_model()
        logger.info(f"ML Model '{default_model.name}' pre-warmed on device: {default_model.device}")
    except Exception as exc:
        logger.error(f"Startup initialization warning: {exc}")
    logger.info("Dhatu Rakshana inspection engine ready for maritime coating evaluations.")
    yield
    logger.info("Shutting down Dhatu Rakshana Backend...")

app = FastAPI(
    title="Dhatu Rakshana (धातु रक्षण) - Defense Marine Platform Coating Inspection API",
    description="Automated defect detection, 3D micro-topography surface reconstruction, and AMPP/NACE/SSPC/ISO compliance grading.",
    version="2.0.0",
    lifespan=lifespan
)

# Centralized Domain Exception Handling
app.add_exception_handler(DhatuRakshanaError, dhatu_exception_handler)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for images, 3D meshes, and reports
storage.bucket_path.mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=str(storage.bucket_path)), name="files")

# 1. Mount Canonical Versioned API under /api/v1
v1_prefix = settings.API_V1_PREFIX  # "/api/v1"
app.include_router(auth_router, prefix=v1_prefix)
app.include_router(inspections_router, prefix=v1_prefix)
app.include_router(zones_router, prefix=v1_prefix)
app.include_router(models_router, prefix=v1_prefix)
app.include_router(artifacts_router, prefix=v1_prefix)
app.include_router(health_router, prefix=v1_prefix)
app.include_router(topology_router, prefix=v1_prefix)

# 2. Mount API under /api prefix for compatibility with /api/auth/login, /api/inspections, etc.
app.include_router(auth_router, prefix="/api")
app.include_router(inspections_router, prefix="/api")
app.include_router(zones_router, prefix="/api")
app.include_router(models_router, prefix="/api")
app.include_router(artifacts_router, prefix="/api")
app.include_router(health_router, prefix="/api")
app.include_router(topology_router, prefix="/api")

# 3. Mount Top-Level Routers for Direct / Prototype Compatibility
app.include_router(auth_router)
app.include_router(inspections_router)
app.include_router(zones_router)
app.include_router(models_router)
app.include_router(artifacts_router)
app.include_router(health_router)
app.include_router(topology_router)

# 3. Database Backup Endpoints
@app.post("/api/v1/system/backup", tags=["System"])
@app.post("/backup", tags=["System"])
def trigger_backup():
    """Trigger online atomic backup of the SQLite database without locking active transactions."""
    try:
        backup_path = backup_database()
        return {
            "status": "success",
            "message": "SQLite database successfully backed up",
            "backup_file": backup_path.name,
            "backup_path": str(backup_path.resolve())
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database backup failed: {exc}")

# 4. Integrated Frontend Serving (Single-URL standalone operation)
if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
    logger.info(f"Serving production React frontend from: {FRONTEND_DIST.resolve()}")

    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="frontend-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Serve existing static file (e.g. favicon.svg, icons.svg, manifest.json)
        potential_file = FRONTEND_DIST / full_path
        if full_path and potential_file.is_file():
            return FileResponse(potential_file)
        # Fallback to index.html for client-side React Router navigation
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "name": "Dhatu Rakshana (धातु रक्षण) Backend",
            "version": "2.0.0",
            "docs_url": "/docs",
            "canonical_api": "/api/v1",
            "health": "/health",
            "frontend_status": "Build frontend into Frontend/dist to enable single-URL web UI serving."
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
