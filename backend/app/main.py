import os
import sys
from pathlib import Path

# Add project root to sys.path so backend works from any working directory
project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from db.db import init_db
from db.seed import seed_zones
from backend.app.config import STORAGE_DIR, CORS_ORIGINS
from backend.app.routes.inspections import router as inspections_router
from backend.app.routes.zones import router as zones_router
from backend.app.routes.auth import router as auth_router

app = FastAPI(
    title="Dhatu Rakshana - Defense Marine Platform Coating Inspection API",
    description="Automated defect detection, 3D surface mapping, and AMPP/NACE/SSPC/ISO standards grading.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

buckets_dir = STORAGE_DIR / "buckets" / "marine-inspections"
buckets_dir.mkdir(parents=True, exist_ok=True)

app.mount("/files", StaticFiles(directory=str(buckets_dir)), name="files")

app.include_router(auth_router)
app.include_router(inspections_router)
app.include_router(zones_router)

@app.on_event("startup")
def on_startup():
    print("[Server] Initializing database and verifying platform zones...")
    try:
        init_db()
        seed_zones()
    except Exception as e:
        print(f"[Server] Startup init error (ignored): {e}")
    print("[Server] Ready for marine coating defect inspections.")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "marine-coating-inspection-backend",
        "version": "1.0.0"
    }

@app.get("/")
def root():
    return {
        "name": "Dhatu Rakshana Backend",
        "docs_url": "/docs",
        "health_check": "/health"
    }
