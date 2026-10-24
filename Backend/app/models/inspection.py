"""Inspection entity representing a marine coating evaluation scan."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship
from app.core.timezone import ISTDateTime, get_ist_now, format_ist_iso

class Inspection(SQLModel, table=True):
    __tablename__ = "inspections"

    id: Optional[int] = Field(default=None, primary_key=True)
    zone_id: int = Field(foreign_key="zones.id", index=True)
    inspector_id: Optional[int] = Field(default=None, foreign_key="users.id", index=True)
    model_version_id: Optional[int] = Field(default=None, foreign_key="model_versions.id", index=True)

    # Storage paths for backwards compatibility with prototype and direct frontend consumers
    image_path: str = Field(default="", max_length=1000)
    mesh_path: Optional[str] = Field(default=None, max_length=500)

    # Processing state & auditability
    status: str = Field(default="COMPLETED", max_length=50, index=True)
    overall_verdict: str = Field(default="PENDING", max_length=50, index=True)
    preprocessing_version: str = Field(default="1.0.0", max_length=50)
    evaluation_engine_version: Optional[str] = Field(default="2.0.0-iso-aligned", max_length=50)
    recalculated_at: Optional[datetime] = Field(default=None, sa_type=ISTDateTime)

    timestamp: datetime = Field(default_factory=get_ist_now, sa_type=ISTDateTime, index=True)
    created_at: datetime = Field(default_factory=get_ist_now, sa_type=ISTDateTime)
    updated_at: Optional[datetime] = Field(default_factory=get_ist_now, sa_type=ISTDateTime)

    # Relationships
    zone: Optional["Zone"] = Relationship(back_populates="inspections")
    inspector: Optional["User"] = Relationship(back_populates="inspections")
    model_version: Optional["ModelVersion"] = Relationship(back_populates="inspections")

    images: List["InspectionImage"] = Relationship(back_populates="inspection", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    detections: List["Detection"] = Relationship(back_populates="inspection", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    measurements: List["InspectionMeasurement"] = Relationship(back_populates="inspection", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    artifacts: List["ProcessingArtifact"] = Relationship(back_populates="inspection", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    reports: List["InspectionReport"] = Relationship(back_populates="inspection", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    jobs: List["ProcessingJob"] = Relationship(back_populates="inspection", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    topology: Optional["TopologyFile"] = Relationship(back_populates="inspection", sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False})
    evaluation_history: List["EvaluationHistory"] = Relationship(back_populates="inspection", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "zone_id": self.zone_id,
            "zone_name": self.zone.name if self.zone else f"Zone {self.zone_id}",
            "overall_verdict": self.overall_verdict,
            "status": self.status,
            "timestamp": format_ist_iso(self.timestamp),
            "image_path": self.image_path,
            "mesh_path": self.mesh_path,
            "defect_count": len(self.detections) if self.detections else 0,
            "has_topology": self.topology is not None or bool(self.mesh_path),
            "topology": self.topology.to_dict() if self.topology else None,
            "evaluation_engine_version": self.evaluation_engine_version,
            "recalculated_at": format_ist_iso(self.recalculated_at) if self.recalculated_at else None
        }

