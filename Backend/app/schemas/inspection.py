"""Inspection request and response schemas matching frontend and API contracts."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.zone import ZoneRead
from app.schemas.detection import DetectionRead
from app.schemas.grading import GradedRecordRead

class InspectionCreateResponse(BaseModel):
    id: Optional[int] = None
    inspection_id: int
    overall_verdict: str
    image_count: int
    status: str
    job_id: Optional[str] = None

class InspectionRead(BaseModel):
    id: int
    timestamp: str
    zone_id: int
    zone_name: str
    overall_verdict: str
    status: Optional[str] = "COMPLETED"
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    mesh_url: Optional[str] = None
    topology_available: bool = False
    topology_info: Optional[Dict[str, Any]] = None
    image_count: int
    defect_count: int

class InspectionDetail(BaseModel):
    id: int
    timestamp: str
    zone_id: int
    zone: Optional[Dict[str, Any]] = None
    overall_verdict: str
    status: Optional[str] = "COMPLETED"
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    image_urls: List[str] = Field(default_factory=list)
    mesh_url: Optional[str] = None
    topology_available: bool = False
    topology_info: Optional[Dict[str, Any]] = None
    detections: List[DetectionRead] = Field(default_factory=list)
    graded_results: List[GradedRecordRead] = Field(default_factory=list)

class InspectionStatusResponse(BaseModel):
    inspection_id: int
    job_id: Optional[str] = None
    status: str
    progress_pct: int = 100
    current_stage: str = "COMPLETED"
    failed_stage: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
