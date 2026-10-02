"""ProcessingJob entity tracking asynchronous inspection pipeline progress."""

from datetime import datetime, timezone
import uuid
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship

class ProcessingJob(SQLModel, table=True):
    __tablename__ = "processing_jobs"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True, max_length=64)
    inspection_id: int = Field(foreign_key="inspections.id", index=True)

    status: str = Field(default="PENDING", max_length=50, index=True)
    progress_pct: int = Field(default=0)
    current_stage: str = Field(default="QUEUED", max_length=50)

    error_code: Optional[str] = Field(default=None, max_length=100)
    error_message: Optional[str] = Field(default=None)

    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = Field(default=None)

    inspection: Optional["Inspection"] = Relationship(back_populates="jobs")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "job_id": self.job_id,
            "inspection_id": self.inspection_id,
            "status": self.status,
            "progress_pct": self.progress_pct,
            "current_stage": self.current_stage,
            "error_code": self.error_code,
            "error_message": self.error_message,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }
