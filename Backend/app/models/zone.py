"""Zone entity representing naval vessel compartments, hulls, decks, and strakes."""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship

class Zone(SQLModel, table=True):
    __tablename__ = "zones"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, max_length=120)
    asset_description: str = Field(default="", max_length=255)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    inspections: List["Inspection"] = Relationship(back_populates="zone")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "asset_description": self.asset_description,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
