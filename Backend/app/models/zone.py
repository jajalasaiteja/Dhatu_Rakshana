"""Zone entity representing naval vessel compartments, hulls, decks, and strakes."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship
from app.core.timezone import ISTDateTime, get_ist_now, format_ist_iso

class Zone(SQLModel, table=True):
    __tablename__ = "zones"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, max_length=120)
    asset_description: str = Field(default="", max_length=255)
    created_at: datetime = Field(default_factory=get_ist_now, sa_type=ISTDateTime)

    inspections: List["Inspection"] = Relationship(back_populates="zone")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "asset_description": self.asset_description,
            "created_at": format_ist_iso(self.created_at)
        }
