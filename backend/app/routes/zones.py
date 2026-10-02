from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from db.db import get_session
from db.models import Zone, Inspection, Detection, GradedDefectRecord

from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/zones", tags=["zones"])

class ZoneCreate(BaseModel):
    name: str
    asset_description: Optional[str] = ""

@router.post("", status_code=201)
def create_zone(zone_in: ZoneCreate, session: Session = Depends(get_session)):
    """POST /zones - creates a new naval platform zone."""
    if not zone_in.name or not zone_in.name.strip():
        raise HTTPException(status_code=400, detail="Zone name cannot be empty.")
    
    zone = Zone(
        name=zone_in.name.strip(),
        asset_description=zone_in.asset_description.strip() if zone_in.asset_description else ""
    )
    session.add(zone)
    session.commit()
    session.refresh(zone)
    return zone.to_dict()

@router.get("")
def list_zones(session: Session = Depends(get_session)):
    """GET /zones - returns list of all platform zones for selector."""
    zones = session.exec(select(Zone)).all()
    return [z.to_dict() for z in zones]

@router.get("/{zone_id}/defects")
def get_zone_defects(zone_id: int, session: Session = Depends(get_session)):
    """GET /zones/{id}/defects - defect records filtered by zone."""
    zone = session.get(Zone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} not found.")

    inspections = session.exec(select(Inspection).where(Inspection.zone_id == zone_id)).all()
    all_defects = []
    verdict_counts = {"PASS": 0, "REVIEW": 0, "FAIL": 0}

    for insp in inspections:
        verdict = insp.overall_verdict.upper()
        if verdict in verdict_counts:
            verdict_counts[verdict] += 1
        for d in insp.detections:
            for g in d.graded_records:
                all_defects.append({
                    "inspection_id": insp.id,
                    "timestamp": insp.timestamp.isoformat(),
                    "class": d.class_name,
                    "subtype": d.subtype,
                    "confidence": d.confidence,
                    "standard_reference": g.standard_reference,
                    "severity": g.severity,
                    "pass_fail": g.pass_fail
                })

    return {
        "zone": zone.to_dict(),
        "total_inspections": len(inspections),
        "verdict_summary": verdict_counts,
        "total_defects_logged": len(all_defects),
        "defect_records": all_defects
    }
