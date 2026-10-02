"""InspectionImage entity representing uploaded specimen image captures."""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship

class InspectionImage(SQLModel, table=True):
    __tablename__ = "inspection_images"

    id: Optional[int] = Field(default=None, primary_key=True)
    inspection_id: int = Field(foreign_key="inspections.id", index=True)
    storage_key: str = Field(max_length=500, index=True)
    original_filename: str = Field(max_length=255)
    file_size_bytes: int = Field(default=0)
    width: int = Field(default=640)
    height: int = Field(default=640)
    checksum_sha256: Optional[str] = Field(default=None, max_length=64)
    is_primary: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    inspection: Optional["Inspection"] = Relationship(back_populates="images")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "inspection_id": self.inspection_id,
            "storage_key": self.storage_key,
            "original_filename": self.original_filename,
            "width": self.width,
            "height": self.height,
            "is_primary": self.is_primary,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
