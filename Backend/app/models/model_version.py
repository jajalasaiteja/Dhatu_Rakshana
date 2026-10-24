"""ModelVersion entity for AI model traceability and audit logging."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship
from app.core.timezone import ISTDateTime, get_ist_now, format_ist_iso

class ModelVersion(SQLModel, table=True):
    __tablename__ = "model_versions"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, max_length=120)
    version: str = Field(max_length=50)
    framework: str = Field(max_length=50)  # "ultralytics", "pytorch", "opencv", "hybrid"
    model_type: str = Field(max_length=50)  # "yolov8", "classical_cv", etc.
    artifact_path: Optional[str] = Field(default=None, max_length=500)
    checksum_sha256: Optional[str] = Field(default=None, max_length=64)
    confidence_threshold: float = Field(default=0.45)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=get_ist_now, sa_type=ISTDateTime)

    inspections: List["Inspection"] = Relationship(back_populates="model_version")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "version": self.version,
            "framework": self.framework,
            "model_type": self.model_type,
            "confidence_threshold": self.confidence_threshold,
            "is_active": self.is_active,
            "created_at": format_ist_iso(self.created_at)
        }
