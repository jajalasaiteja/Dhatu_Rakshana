"""Inspection request and response schemas matching frontend and API contracts."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.zone import ZoneRead
from app.schemas.detection import DetectionRead
from app.schemas.grading import GradedRecordRead
from app.schemas.measurement import InspectionMeasurementRead

class InspectionCreateResponse(BaseModel):
    id: Optional[int] = None
    inspection_id: int
    overall_verdict: str
    image_count: int
    status: str
    job_id: Optional[str] = None
    operation_mode: Optional[str] = "balanced"

class InspectionRead(BaseModel):
    id: int
    display_id: Optional[int] = None
    display_label: Optional[str] = None
    timestamp: str
    zone_id: int
    zone_name: str
    overall_verdict: str
    status: Optional[str] = "COMPLETED"
    operation_mode: Optional[str] = "balanced"
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    mesh_url: Optional[str] = None
    topology_available: bool = False
    topology_info: Optional[Dict[str, Any]] = None
    image_count: int
    defect_count: int
    evaluation_engine_version: Optional[str] = "2.0.0-iso-aligned"
    recalculated_at: Optional[str] = None

class InspectionDetail(BaseModel):
    id: int
    display_id: Optional[int] = None
    display_label: Optional[str] = None
    timestamp: str
    zone_id: int
    zone: Optional[Dict[str, Any]] = None
    overall_verdict: str
    status: Optional[str] = "COMPLETED"
    operation_mode: Optional[str] = "balanced"
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    image_urls: List[str] = Field(default_factory=list)
    mesh_url: Optional[str] = None
    topology_available: bool = False
    topology_info: Optional[Dict[str, Any]] = None
    detections: List[DetectionRead] = Field(default_factory=list)
    graded_results: List[GradedRecordRead] = Field(default_factory=list)
    measurements: List[InspectionMeasurementRead] = Field(default_factory=list)
    evaluation_summary: Optional[Dict[str, Any]] = None
    evaluation_engine_version: Optional[str] = "2.0.0-iso-aligned"
    recalculated_at: Optional[str] = None

class InspectionStatusResponse(BaseModel):
    inspection_id: int
    job_id: Optional[str] = None
    status: str
    progress_pct: int = 100
    current_stage: str = "COMPLETED"
    failed_stage: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
