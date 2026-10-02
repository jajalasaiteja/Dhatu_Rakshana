"""Detection schemas."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.grading import GradedRecordRead
from app.schemas.measurement import MeasurementRead

class DetectionRead(BaseModel):
    id: int
    inspection_id: int
    class_name: str = Field(alias="class")
    subtype: str
    bbox: List[float]
    confidence: float
    area_pct: Optional[float] = 0.0
    severity: Optional[str] = "Medium"
    graded_records: Optional[List[GradedRecordRead]] = []
    measurement: Optional[MeasurementRead] = None

    class Config:
        populate_by_name = True
