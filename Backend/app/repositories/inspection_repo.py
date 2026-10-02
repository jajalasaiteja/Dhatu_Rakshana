"""Inspection repository with eager-loading and query filters."""

from typing import List, Optional
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from app.models.inspection import Inspection
from app.repositories.base import BaseRepository

class InspectionRepository(BaseRepository[Inspection]):
    def __init__(self, session: Session):
        super().__init__(Inspection, session)

    def get_with_details(self, inspection_id: int) -> Optional[Inspection]:
        statement = (
            select(Inspection)
            .where(Inspection.id == inspection_id)
            .options(
                selectinload(Inspection.zone),
                selectinload(Inspection.images),
                selectinload(Inspection.detections),
                selectinload(Inspection.artifacts),
                selectinload(Inspection.jobs),
                selectinload(Inspection.reports)
            )
        )
        return self.session.exec(statement).first()

    def list_inspections(
        self,
        zone_id: Optional[int] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Inspection]:
        statement = select(Inspection).options(selectinload(Inspection.zone), selectinload(Inspection.detections))

        if zone_id is not None:
            statement = statement.where(Inspection.zone_id == zone_id)
        if status is not None:
            statement = statement.where(Inspection.status == status)

        statement = statement.order_by(Inspection.timestamp.desc()).offset(skip).limit(limit)
        return self.session.exec(statement).all()
