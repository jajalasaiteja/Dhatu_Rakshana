"""ProcessingArtifact entity tracking generated meshes, annotated images, reports, and masks."""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship

class ProcessingArtifact(SQLModel, table=True):
    __tablename__ = "processing_artifacts"

    id: Optional[int] = Field(default=None, primary_key=True)
    inspection_id: int = Field(foreign_key="inspections.id", index=True)

    artifact_type: str = Field(index=True, max_length=50)  # SOURCE_IMAGE, ANNOTATED_IMAGE, MASK, MESH_PLY, PDF_REPORT
    storage_key: str = Field(max_length=500, index=True)
    mime_type: str = Field(default="application/octet-stream", max_length=100)
    file_size_bytes: int = Field(default=0)
    checksum_sha256: Optional[str] = Field(default=None, max_length=64)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    inspection: Optional["Inspection"] = Relationship(back_populates="artifacts")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "inspection_id": self.inspection_id,
            "artifact_type": self.artifact_type,
            "storage_key": self.storage_key,
            "mime_type": self.mime_type,
            "file_size_bytes": self.file_size_bytes,
            "checksum_sha256": self.checksum_sha256,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
