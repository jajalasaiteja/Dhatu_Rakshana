"""Schemas for 3D micro-topography PLY file metadata and upload responses."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class TopologyRead(BaseModel):
    id: int
    inspection_id: int
    original_filename: str
    stored_filename: str
    file_size: int
    file_hash: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class TopologyUploadResponse(BaseModel):
    id: int
    inspection_id: int
    filename: str
    file_size: int
    sha256: str
    created_at: Optional[datetime] = None

class TopologyDetail(BaseModel):
    id: int
    inspection_id: int
    original_filename: str
    stored_filename: str
    file_size: int
    file_hash: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    download_url: str
    integrity_verified: bool = True
