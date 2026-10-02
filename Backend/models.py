from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


# ---------------------------------------------------------------------------
# Database Tables
# ---------------------------------------------------------------------------

class Artifact(SQLModel, table=True):
    """Represents a metal artifact or component registered for preservation/inspection."""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, nullable=False)
    material_type: str = Field(default="Bronze", index=True, nullable=False)
    period_or_era: Optional[str] = Field(default=None)
    location: Optional[str] = Field(default=None)
    description: Optional[str] = Field(default=None)
    preservation_state: str = Field(default="Under Observation", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    inspections: List["Inspection"] = Relationship(back_populates="artifact")


class Inspection(SQLModel, table=True):
    """Represents an inspection assessment (corrosion, defect analysis, 3D scan)."""
    id: Optional[int] = Field(default=None, primary_key=True)
    artifact_id: Optional[int] = Field(default=None, foreign_key="artifact.id", index=True)
    inspector_name: Optional[str] = Field(default=None)
    corrosion_type: Optional[str] = Field(default=None)
    severity_level: str = Field(default="Low", index=True)
    confidence_score: Optional[float] = Field(default=None)
    image_path: Optional[str] = Field(default=None)
    point_cloud_path: Optional[str] = Field(default=None)
    findings: Optional[str] = Field(default=None)
    recommendations: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Relationships
    artifact: Optional[Artifact] = Relationship(back_populates="inspections")


# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------

class ArtifactCreate(SQLModel):
    name: str
    material_type: str = "Bronze"
    period_or_era: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    preservation_state: str = "Under Observation"


class ArtifactUpdate(SQLModel):
    name: Optional[str] = None
    material_type: Optional[str] = None
    period_or_era: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    preservation_state: Optional[str] = None


class InspectionCreate(SQLModel):
    artifact_id: int
    inspector_name: Optional[str] = None
    corrosion_type: Optional[str] = None
    severity_level: str = "Low"
    confidence_score: Optional[float] = None
    image_path: Optional[str] = None
    point_cloud_path: Optional[str] = None
    findings: Optional[str] = None
    recommendations: Optional[str] = None


class InspectionRead(SQLModel):
    id: int
    artifact_id: Optional[int] = None
    inspector_name: Optional[str] = None
    corrosion_type: Optional[str] = None
    severity_level: str
    confidence_score: Optional[float] = None
    image_path: Optional[str] = None
    point_cloud_path: Optional[str] = None
    findings: Optional[str] = None
    recommendations: Optional[str] = None
    created_at: datetime


class ArtifactRead(SQLModel):
    id: int
    name: str
    material_type: str
    period_or_era: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    preservation_state: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class ArtifactReadWithInspections(ArtifactRead):
    inspections: List[InspectionRead] = []


class HealthResponse(SQLModel):
    status: str
    environment: str
    database: dict
