"""Database models for Defense Marine Platform Coating Inspection System."""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import json
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String, Text

class Zone(SQLModel, table=True):
    __tablename__ = "zones"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, max_length=120)
    asset_description: str = Field(default="", max_length=255)

    inspections: List["Inspection"] = Relationship(back_populates="zone")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "asset_description": self.asset_description
        }

class Inspection(SQLModel, table=True):
    __tablename__ = "inspections"

    id: Optional[int] = Field(default=None, primary_key=True)
    image_path: str = Field(max_length=500)
    mesh_path: Optional[str] = Field(default=None, max_length=500)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    zone_id: int = Field(foreign_key="zones.id", index=True)
    overall_verdict: str = Field(default="PENDING", max_length=50)

    zone: Optional[Zone] = Relationship(back_populates="inspections")
    detections: List["Detection"] = Relationship(back_populates="inspection")

class Detection(SQLModel, table=True):
    __tablename__ = "detections"

    id: Optional[int] = Field(default=None, primary_key=True)
    inspection_id: int = Field(foreign_key="inspections.id", index=True)
    # Map to SQL column named "class" to strictly fulfill schema specification
    class_name: str = Field(sa_column=Column("class", String(50), nullable=False))
    subtype: str = Field(max_length=50)
    bbox_raw: str = Field(sa_column=Column("bbox", Text, nullable=False))
    confidence: float = Field(default=0.0)

    inspection: Optional[Inspection] = Relationship(back_populates="detections")
    graded_records: List["GradedDefectRecord"] = Relationship(back_populates="detection")

    @property
    def bbox(self) -> List[float]:
        try:
            return json.loads(self.bbox_raw)
        except Exception:
            return []

    @bbox.setter
    def bbox(self, coords: List[float]):
        self.bbox_raw = json.dumps(coords)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "inspection_id": self.inspection_id,
            "class": self.class_name,
            "subtype": self.subtype,
            "bbox": self.bbox,
            "confidence": self.confidence,
            "graded_records": [g.to_dict() for g in self.graded_records] if self.graded_records else []
        }

class GradedDefectRecord(SQLModel, table=True):
    __tablename__ = "graded_defect_records"

    id: Optional[int] = Field(default=None, primary_key=True)
    detection_id: int = Field(foreign_key="detections.id", index=True)
    standard_reference: str = Field(max_length=200)
    severity: str = Field(max_length=50)
    pass_fail: str = Field(max_length=50)

    detection: Optional[Detection] = Relationship(back_populates="graded_records")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "detection_id": self.detection_id,
            "standard_reference": self.standard_reference,
            "severity": self.severity,
            "pass_fail": self.pass_fail
        }


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, max_length=255)
    password_hash: str = Field(max_length=255)
    full_name: str = Field(max_length=255)
    role: str = Field(default="inspector", max_length=50)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role
        }
