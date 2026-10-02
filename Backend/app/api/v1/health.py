"""Health and readiness observability endpoints."""

from fastapi import APIRouter
from app.db.session import check_db_health
from app.ml.registry import model_registry
from app.schemas.common import HealthResponse

router = APIRouter(tags=["health"])

@router.get("/health", response_model=HealthResponse)
def health():
    """Health check endpoint providing status of API, Database, and ML subsystems."""
    db_health = check_db_health()
    active_models = model_registry.list_available_models()
    return HealthResponse(
        status="healthy" if db_health.get("status") == "connected" else "degraded",
        service="dhatu-rakshana-backend",
        version="1.0.0",
        database=db_health.get("dialect", "unknown"),
        ml_device=model_registry.device,
        active_models=len(active_models)
    )

@router.get("/ready")
def ready():
    """Readiness probe for container orchestrators."""
    db_health = check_db_health()
    if db_health.get("status") != "connected":
        return {"status": "not_ready", "reason": "database_disconnected"}
    return {"status": "ready"}
