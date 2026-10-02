"""Model registry diagnostic and lookup API routes."""

from fastapi import APIRouter
from app.ml.registry import model_registry

router = APIRouter(prefix="/models", tags=["models"])

@router.get("")
def list_models():
    """Lists registered AI/CV defect detection models and runtime status."""
    return {
        "active_models": model_registry.list_available_models(),
        "device": model_registry.device
    }
