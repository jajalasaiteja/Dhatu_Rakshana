"""Measurement schemas."""

from typing import Optional, Union
from datetime import datetime
from pydantic import BaseModel

class MeasurementRead(BaseModel):
    id: Optional[int] = None
    detection_id: Optional[int] = None
    bbox_width: float
    bbox_height: float
    aspect_ratio: float
    pixel_area: float
    area_pct: float
    centroid_x: float
    centroid_y: float
    surface_depth_proxy: Optional[float] = None
    roughness_index: Optional[float] = None

class InspectionMeasurementRead(BaseModel):
    id: Optional[int] = None
    inspection_id: int
    image_id: Optional[int] = None
    measurement_key: str
    measurement_name: str
    measurement_category: str
    measured_value: Optional[str] = None
    numeric_value: Optional[float] = None
    unit: Optional[str] = None
    applicable_standard: Optional[str] = None
    standard_edition: Optional[str] = None
    rating_or_criterion: Optional[str] = None
    assessment_status: str = "Measured"
    confidence: Optional[float] = None
    measurement_method: Optional[str] = None
    evidence_source: Optional[str] = None
    explanation: Optional[str] = None
    evaluation_engine_version: str = "2.0.0-iso-aligned"
    evaluation_timestamp: Optional[Union[str, datetime]] = None
