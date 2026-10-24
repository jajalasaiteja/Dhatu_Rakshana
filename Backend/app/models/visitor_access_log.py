"""Visitor access log entity for recording visitor viewing events and audit trail."""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field
from app.core.timezone import ISTDateTime, get_ist_now, format_ist_iso

class VisitorAccessLog(SQLModel, table=True):
    __tablename__ = "visitor_access_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    visitor_username: str = Field(index=True, max_length=100)
    session_id: Optional[str] = Field(default=None, index=True, max_length=100)
    event_type: str = Field(default="SUCCESSFUL_ACCESS", max_length=50)
    accessed_at: datetime = Field(default_factory=get_ist_now, sa_type=ISTDateTime, index=True)
    created_at: datetime = Field(default_factory=get_ist_now, sa_type=ISTDateTime)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "visitor_username": self.visitor_username,
            "session_id": self.session_id,
            "event_type": self.event_type,
            "accessed_at": format_ist_iso(self.accessed_at),
            "created_at": format_ist_iso(self.created_at)
        }
