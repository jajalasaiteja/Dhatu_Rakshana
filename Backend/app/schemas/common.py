"""Common schemas for pagination, response envelopes, and health metrics."""

from typing import Optional, Generic, TypeVar, List, Any
from pydantic import BaseModel, Field

T = TypeVar("T")

class StatusResponse(BaseModel):
    status: str
    message: Optional[str] = None

class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "dhatu-rakshana-backend"
    version: str = "1.0.0"
    database: Optional[str] = None
    ml_device: Optional[str] = None
    active_models: Optional[int] = None

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int
