"""Measurement schemas."""

from typing import Optional
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
