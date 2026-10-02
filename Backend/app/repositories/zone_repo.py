"""Zone repository for naval platform compartment lookups."""

from typing import List, Optional
from sqlmodel import Session, select
from app.models.zone import Zone
from app.repositories.base import BaseRepository

class ZoneRepository(BaseRepository[Zone]):
    def __init__(self, session: Session):
        super().__init__(Zone, session)

    def get_by_name(self, name: str) -> Optional[Zone]:
        clean_name = name.strip()
        return self.session.exec(select(Zone).where(Zone.name == clean_name)).first()

    def get_all_ordered(self) -> List[Zone]:
        return self.session.exec(select(Zone).order_by(Zone.id.asc())).all()
