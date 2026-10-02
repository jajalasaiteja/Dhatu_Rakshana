"""Zone request and response schemas."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ZoneCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    asset_description: Optional[str] = ""

class ZoneRead(BaseModel):
    id: int
    name: str
    asset_description: Optional[str] = ""

class ZoneDefectRecord(BaseModel):
    inspection_id: int
    timestamp: str
    class_name: str = Field(alias="class")
    subtype: str
    confidence: float
    standard_reference: str
    severity: str
    pass_fail: str

    class Config:
        populate_by_name = True

class ZoneDefectsSummary(BaseModel):
    zone: ZoneRead
    total_inspections: int
    verdict_summary: Dict[str, int]
    total_defects_logged: int
    defect_records: List[Dict[str, Any]]
