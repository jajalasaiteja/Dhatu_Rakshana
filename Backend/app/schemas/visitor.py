"""Pydantic schemas for visitor access, token issuance, records viewing, and activity logs."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from app.schemas.detection import DetectionRead
from app.schemas.grading import GradedRecordRead
from app.schemas.measurement import InspectionMeasurementRead

class VisitorAccessRequest(BaseModel):
    username: str = Field(..., description="Authorized visitor username")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Visitor username cannot be empty or whitespace.")
        if len(trimmed) > 100:
            raise ValueError("Visitor username must be at most 100 characters.")
        return trimmed

class VisitorTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 3600
    username: str
    session_id: str
    role: str = "visitor"
    accessed_at: Optional[str] = None

class VisitorRecordItem(BaseModel):
    id: int
    display_id: Optional[int] = None
    display_label: Optional[str] = None
    timestamp: str
    zone_id: int
    zone_name: str
    overall_verdict: str
    status: Optional[str] = "COMPLETED"
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    mesh_url: Optional[str] = None
    defect_count: int
    image_count: int
    topology_available: bool = False
    topology_info: Optional[Dict[str, Any]] = None
    evaluation_engine_version: Optional[str] = "2.0.0-iso-aligned"

class VisitorRecordDetail(BaseModel):
    id: int
    display_id: Optional[int] = None
    display_label: Optional[str] = None
    timestamp: str
    zone_id: int
    zone_name: str
    zone: Optional[Dict[str, Any]] = None
    overall_verdict: str
    status: Optional[str] = "COMPLETED"
    preprocessing_version: Optional[str] = "1.0.0"
    evaluation_engine_version: Optional[str] = "2.0.0-iso-aligned"
    recalculated_at: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    image_urls: List[str] = Field(default_factory=list)
    mesh_url: Optional[str] = None
    topology_available: bool = False
    topology_info: Optional[Dict[str, Any]] = None
    defect_count: int
    image_count: int
    detections: List[DetectionRead] = Field(default_factory=list)
    graded_results: List[GradedRecordRead] = Field(default_factory=list)
    measurements: List[InspectionMeasurementRead] = Field(default_factory=list)
    evaluation_summary: Optional[Dict[str, Any]] = None

class VisitorAccessLogItem(BaseModel):
    id: int
    visitor_username: str
    session_id: Optional[str] = None
    event_type: str
    accessed_at: str
    created_at: Optional[str] = None

class VisitorLogsResponse(BaseModel):
    logs: List[VisitorAccessLogItem]
    total_count: int
    page: int
    limit: int
