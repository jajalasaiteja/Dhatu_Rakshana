"""TopologyFile SQLModel entity storing metadata and hashes for 3D micro-topography PLY meshes."""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship

class TopologyFile(SQLModel, table=True):
    __tablename__ = "topology_files"

    id: Optional[int] = Field(default=None, primary_key=True)
    inspection_id: int = Field(foreign_key="inspections.id", unique=True, index=True)

    original_filename: str = Field(default="topology.ply", max_length=255)
    stored_filename: str = Field(default="topology.ply", max_length=255)
    storage_path: str = Field(max_length=500)
    file_size: int = Field(default=0)
    file_hash: str = Field(max_length=64, index=True)  # SHA-256 hex digest

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationship to parent inspection
    inspection: Optional["Inspection"] = Relationship(back_populates="topology")

    def to_dict(self) -> Dict[str, Any]:
        """Public metadata representation. Internal absolute filesystem paths are NOT exposed."""
        return {
            "id": self.id,
            "inspection_id": self.inspection_id,
            "original_filename": self.original_filename,
            "stored_filename": self.stored_filename,
            "file_size": self.file_size,
            "file_hash": self.file_hash,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
