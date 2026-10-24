"""User entity for inspector authentication and RBAC."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship
from app.core.timezone import ISTDateTime, get_ist_now, format_ist_iso

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: Optional[str] = Field(default=None, unique=True, index=True, max_length=100)
    email: str = Field(index=True, unique=True, max_length=255)
    password_hash: str = Field(max_length=255)
    full_name: str = Field(max_length=255)
    role: str = Field(default="inspector", max_length=50)  # admin, inspector, viewer
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=get_ist_now, sa_type=ISTDateTime)
    updated_at: Optional[datetime] = Field(default_factory=get_ist_now, sa_type=ISTDateTime)

    inspections: List["Inspection"] = Relationship(back_populates="inspector")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "username": self.username or self.email.split("@")[0],
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": format_ist_iso(self.created_at)
        }
