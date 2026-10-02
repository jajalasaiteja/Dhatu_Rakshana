"""Grading records schemas."""

from typing import Optional
from pydantic import BaseModel

class GradedRecordRead(BaseModel):
    id: Optional[int] = None
    detection_id: Optional[int] = None
    standard_reference: str
    rule_version: Optional[str] = "2.1.0"
    severity: str
    pass_fail: str
    notes: Optional[str] = None
