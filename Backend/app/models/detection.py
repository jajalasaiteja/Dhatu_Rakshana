"""Detection entity representing an AI/CV identified defect in a coating scan."""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import json
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String, Text

class Detection(SQLModel, table=True):
    __tablename__ = "detections"

    id: Optional[int] = Field(default=None, primary_key=True)
    inspection_id: int = Field(foreign_key="inspections.id", index=True)
    image_id: Optional[int] = Field(default=None, foreign_key="inspection_images.id", nullable=True)

    # Map to SQL column named "class" to strictly fulfill schema specification and prototype queries
    class_name: str = Field(sa_column=Column("class", String(50), nullable=False))
    subtype: str = Field(max_length=50, index=True)
    bbox_raw: str = Field(sa_column=Column("bbox", Text, nullable=False))
    confidence: float = Field(default=0.0)
    area_pct: Optional[float] = Field(default=0.0)
    severity: Optional[str] = Field(default="Medium", max_length=50)

    # Relationships
    inspection: Optional["Inspection"] = Relationship(back_populates="detections")
    graded_records: List["GradedDefectRecord"] = Relationship(
        back_populates="detection",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    measurement: Optional["DefectMeasurement"] = Relationship(
        back_populates="detection",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False}
    )

    @property
    def bbox(self) -> List[float]:
        try:
            return json.loads(self.bbox_raw)
        except Exception:
            return []

    @bbox.setter
    def bbox(self, coords: List[float]):
        self.bbox_raw = json.dumps([round(float(c), 2) for c in coords])

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "inspection_id": self.inspection_id,
            "class": self.class_name,
            "subtype": self.subtype,
            "bbox": self.bbox,
            "confidence": round(self.confidence, 4),
            "area_pct": self.area_pct,
            "severity": self.severity,
            "graded_records": [g.to_dict() for g in self.graded_records] if self.graded_records else [],
            "measurement": self.measurement.to_dict() if self.measurement else None
        }
