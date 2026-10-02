"""Report and ModelVersion schemas."""

from typing import Optional
from pydantic import BaseModel

class ReportRead(BaseModel):
    id: int
    inspection_id: int
    report_title: str
    storage_key: str
    file_size_bytes: int
    checksum_sha256: Optional[str] = None
    generated_at: str

class ModelVersionRead(BaseModel):
    id: int
    name: str
    version: str
    framework: str
    model_type: str
    confidence_threshold: float
    is_active: bool
