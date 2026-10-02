"""Zone management API routes for naval defense platforms."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.zone import Zone
from app.models.inspection import Inspection
from app.schemas.zone import ZoneCreate, ZoneRead, ZoneDefectsSummary

router = APIRouter(prefix="/zones", tags=["zones"])

@router.post("", response_model=ZoneRead, status_code=status.HTTP_201_CREATED)
def create_zone(data: ZoneCreate, session: Session = Depends(get_session)):
    """Creates a new naval defense platform zone."""
    name_clean = data.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Zone name cannot be empty.")

    zone = Zone(
        name=name_clean,
        asset_description=data.asset_description.strip() if data.asset_description else ""
    )
    session.add(zone)
    session.commit()
    session.refresh(zone)
    return ZoneRead(
        id=zone.id,
        name=zone.name,
        asset_description=zone.asset_description
    )

@router.get("", response_model=List[ZoneRead])
def list_zones(session: Session = Depends(get_session)):
    """Returns list of all platform zones for selector."""
    zones = session.exec(select(Zone).order_by(Zone.id.asc())).all()
    return [
        ZoneRead(id=z.id, name=z.name, asset_description=z.asset_description)
        for z in zones
    ]

@router.get("/{zone_id}", response_model=ZoneRead)
def get_zone(zone_id: int, session: Session = Depends(get_session)):
    """Returns metadata for a specific platform zone."""
    zone = session.get(Zone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} not found.")
    return ZoneRead(id=zone.id, name=zone.name, asset_description=zone.asset_description)

@router.get("/{zone_id}/defects", response_model=ZoneDefectsSummary)
def get_zone_defects(zone_id: int, session: Session = Depends(get_session)):
    """Returns defect records and compliance breakdown for a specific zone."""
    zone = session.get(Zone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} not found.")

    inspections = session.exec(select(Inspection).where(Inspection.zone_id == zone_id)).all()
    all_defects = []
    verdict_counts = {"PASS": 0, "REVIEW": 0, "FAIL": 0}

    for insp in inspections:
        v = insp.overall_verdict.upper()
        if v in verdict_counts:
            verdict_counts[v] += 1

        for d in insp.detections:
            for g in d.graded_records:
                all_defects.append({
                    "inspection_id": insp.id,
                    "timestamp": insp.timestamp.isoformat() if insp.timestamp else "",
                    "class": d.class_name,
                    "subtype": d.subtype,
                    "confidence": d.confidence,
                    "standard_reference": g.standard_reference,
                    "severity": g.severity,
                    "pass_fail": g.pass_fail
                })

    return ZoneDefectsSummary(
        zone=ZoneRead(id=zone.id, name=zone.name, asset_description=zone.asset_description),
        total_inspections=len(inspections),
        verdict_summary=verdict_counts,
        total_defects_logged=len(all_defects),
        defect_records=all_defects
    )
