"""GradedDefectRecord entity for defense coating standard evaluations."""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship

class GradedDefectRecord(SQLModel, table=True):
    __tablename__ = "graded_defect_records"

    id: Optional[int] = Field(default=None, primary_key=True)
    detection_id: int = Field(foreign_key="detections.id", index=True)
    standard_reference: str = Field(max_length=200)
    rule_version: str = Field(default="2.1.0", max_length=50)
    severity: str = Field(max_length=50)
    pass_fail: str = Field(max_length=50)
    notes: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    detection: Optional["Detection"] = Relationship(back_populates="graded_records")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "detection_id": self.detection_id,
            "standard_reference": self.standard_reference,
            "rule_version": self.rule_version,
            "severity": self.severity,
            "pass_fail": self.pass_fail,
            "notes": self.notes
        }
