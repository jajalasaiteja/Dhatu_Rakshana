from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

try:
    from .config import APP_NAME, APP_ENV, DEBUG, CORS_ORIGINS
    from .database import get_session, check_db_connection
    from .models import (
        Artifact,
        ArtifactCreate,
        ArtifactRead,
        ArtifactReadWithInspections,
        ArtifactUpdate,
        Inspection,
        InspectionCreate,
        InspectionRead,
        HealthResponse,
    )
except ImportError:
    from config import APP_NAME, APP_ENV, DEBUG, CORS_ORIGINS
    from database import get_session, check_db_connection
    from models import (
        Artifact,
        ArtifactCreate,
        ArtifactRead,
        ArtifactReadWithInspections,
        ArtifactUpdate,
        Inspection,
        InspectionCreate,
        InspectionRead,
        HealthResponse,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify database connection on startup
    try:
        db_info = check_db_connection()
        print(f"[{APP_NAME}] Connected to PostgreSQL: {db_info['database']}")
    except Exception as exc:
        print(f"[{APP_NAME}] Database connection check failed: {exc}")
    yield


app = FastAPI(
    title=APP_NAME,
    description="Backend API for Project Dhatu Rakshana - Metal Preservation and Inspection System",
    version="1.0.0",
    lifespan=lifespan,
    debug=DEBUG,
)

# CORS middleware to allow communication from React/Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health / Info Endpoints
# ---------------------------------------------------------------------------

@app.get("/", tags=["Info"])
def read_root():
    return {
        "service": APP_NAME,
        "environment": APP_ENV,
        "status": "online",
        "docs_url": "/docs",
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """Verify backend status and PostgreSQL database connection."""
    try:
        db_info = check_db_connection()
        return HealthResponse(
            status="healthy",
            environment=APP_ENV,
            database=db_info,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "unhealthy",
                "database_error": str(exc),
            },
        )


# ---------------------------------------------------------------------------
# Artifact Endpoints
# ---------------------------------------------------------------------------

@app.post(
    "/api/artifacts",
    response_model=ArtifactRead,
    status_code=status.HTTP_201_CREATED,
    tags=["Artifacts"],
)
def create_artifact(
    artifact_in: ArtifactCreate,
    session: Session = Depends(get_session),
):
    """Register a new metal artifact for inspection and monitoring."""
    artifact = Artifact.model_validate(artifact_in)
    session.add(artifact)
    session.commit()
    session.refresh(artifact)
    return artifact


@app.get(
    "/api/artifacts",
    response_model=List[ArtifactRead],
    tags=["Artifacts"],
)
def list_artifacts(
    material_type: Optional[str] = Query(None, description="Filter by material type"),
    preservation_state: Optional[str] = Query(None, description="Filter by preservation state"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """List metal artifacts with optional filtering."""
    query = select(Artifact)
    if material_type:
        query = query.where(Artifact.material_type == material_type)
    if preservation_state:
        query = query.where(Artifact.preservation_state == preservation_state)
    query = query.offset(skip).limit(limit)
    artifacts = session.exec(query).all()
    return artifacts


@app.get(
    "/api/artifacts/{artifact_id}",
    response_model=ArtifactReadWithInspections,
    tags=["Artifacts"],
)
def get_artifact(
    artifact_id: int,
    session: Session = Depends(get_session),
):
    """Retrieve an artifact along with its historical inspection records."""
    artifact = session.get(Artifact, artifact_id)
    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact with ID {artifact_id} not found",
        )
    return artifact


@app.patch(
    "/api/artifacts/{artifact_id}",
    response_model=ArtifactRead,
    tags=["Artifacts"],
)
def update_artifact(
    artifact_id: int,
    artifact_update: ArtifactUpdate,
    session: Session = Depends(get_session),
):
    """Update fields of an existing artifact."""
    artifact = session.get(Artifact, artifact_id)
    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact with ID {artifact_id} not found",
        )
    update_data = artifact_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(artifact, field, value)
    artifact.updated_at = datetime.utcnow()
    session.add(artifact)
    session.commit()
    session.refresh(artifact)
    return artifact


@app.delete(
    "/api/artifacts/{artifact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Artifacts"],
)
def delete_artifact(
    artifact_id: int,
    session: Session = Depends(get_session),
):
    """Remove an artifact record from the database."""
    artifact = session.get(Artifact, artifact_id)
    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact with ID {artifact_id} not found",
        )
    session.delete(artifact)
    session.commit()
    return None


# ---------------------------------------------------------------------------
# Inspection Endpoints
# ---------------------------------------------------------------------------

@app.post(
    "/api/inspections",
    response_model=InspectionRead,
    status_code=status.HTTP_201_CREATED,
    tags=["Inspections"],
)
def create_inspection(
    inspection_in: InspectionCreate,
    session: Session = Depends(get_session),
):
    """Record a corrosion analysis, defect assessment, or inspection event."""
    # Ensure referenced artifact exists
    artifact = session.get(Artifact, inspection_in.artifact_id)
    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Referenced artifact ID {inspection_in.artifact_id} does not exist",
        )

    inspection = Inspection.model_validate(inspection_in)
    session.add(inspection)
    session.commit()
    session.refresh(inspection)
    return inspection


@app.get(
    "/api/inspections",
    response_model=List[InspectionRead],
    tags=["Inspections"],
)
def list_inspections(
    artifact_id: Optional[int] = Query(None, description="Filter by artifact ID"),
    severity_level: Optional[str] = Query(None, description="Filter by severity level"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """List inspection records with optional filters."""
    query = select(Inspection)
    if artifact_id is not None:
        query = query.where(Inspection.artifact_id == artifact_id)
    if severity_level:
        query = query.where(Inspection.severity_level == severity_level)
    query = query.offset(skip).limit(limit)
    inspections = session.exec(query).all()
    return inspections


@app.get(
    "/api/inspections/{inspection_id}",
    response_model=InspectionRead,
    tags=["Inspections"],
)
def get_inspection(
    inspection_id: int,
    session: Session = Depends(get_session),
):
    """Retrieve an inspection record by ID."""
    inspection = session.get(Inspection, inspection_id)
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection with ID {inspection_id} not found",
        )
    return inspection
