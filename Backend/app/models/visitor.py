"""Visitor identity entity for authorized visitor access registry."""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field
from app.core.timezone import ISTDateTime, get_ist_now, format_ist_iso

class Visitor(SQLModel, table=True):
    __tablename__ = "visitors"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True, max_length=100)
    full_name: Optional[str] = Field(default=None, max_length=255)
    organization: Optional[str] = Field(default=None, max_length=255)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=get_ist_now, sa_type=ISTDateTime)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "username": self.username,
            "full_name": self.full_name,
            "organization": self.organization,
            "is_active": self.is_active,
            "created_at": format_ist_iso(self.created_at)
        }
