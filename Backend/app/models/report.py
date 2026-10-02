"""InspectionReport entity representing generated PDF inspection audit reports."""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship

class InspectionReport(SQLModel, table=True):
    __tablename__ = "inspection_reports"

    id: Optional[int] = Field(default=None, primary_key=True)
    inspection_id: int = Field(foreign_key="inspections.id", index=True)

    report_title: str = Field(default="Defense Marine Coating Inspection Audit Report", max_length=255)
    storage_key: str = Field(max_length=500, index=True)
    checksum_sha256: Optional[str] = Field(default=None, max_length=64)
    file_size_bytes: int = Field(default=0)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    inspection: Optional["Inspection"] = Relationship(back_populates="reports")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "inspection_id": self.inspection_id,
            "report_title": self.report_title,
            "storage_key": self.storage_key,
            "file_size_bytes": self.file_size_bytes,
            "checksum_sha256": self.checksum_sha256,
            "generated_at": self.generated_at.isoformat() if self.generated_at else None
        }
