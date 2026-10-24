"""Visitor API routes for visitor access authorization, permitted record viewing, and inspector audit logs."""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import FileResponse
from sqlmodel import Session, select, func
import logging

from app.core.timezone import get_ist_now, format_ist_iso

from app.db.session import get_session
from app.models.user import User
from app.models.visitor import Visitor
from app.models.visitor_access_log import VisitorAccessLog
from app.models.inspection import Inspection
from app.models.topology import TopologyFile
from app.storage.topology_storage import topology_storage
from app.schemas.visitor import (
    VisitorAccessRequest,
    VisitorTokenResponse,
    VisitorRecordItem,
    VisitorRecordDetail,
    VisitorAccessLogItem,
    VisitorLogsResponse,
)
from app.api.deps import (
    get_current_user,
    require_inspector,
    get_current_visitor,
    VisitorSession,
)
from app.core.security import create_visitor_token
from app.core.config import settings
from app.services.inspection_service import InspectionService

logger = logging.getLogger("dhatu_rakshana.api.visitors")

router = APIRouter(prefix="/visitors", tags=["visitors"])

@router.post("/access", response_model=VisitorTokenResponse, status_code=status.HTTP_200_OK)
def request_visitor_access(
    data: VisitorAccessRequest,
    session: Session = Depends(get_session)
):
    """
    POST /visitors/access: Validates visitor identity against defined visitor-access policy.
    If valid, creates a visitor access log with server-generated UTC timestamp and issues
    a dedicated visitor access session credential.
    """
    clean_username = data.username.strip()
    if not clean_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Visitor username cannot be empty."
        )

    # Validate against Visitor registry
    visitor = session.exec(
        select(Visitor).where(
            Visitor.username == clean_username,
            Visitor.is_active == True
        )
    ).first()

    if not visitor:
        logger.warning(f"Visitor access denied for unauthorized username: '{clean_username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid visitor username. Access is restricted to authorized visitor identifiers."
        )

    # Generate session ID and record access event with server-generated IST timestamp
    session_id = str(uuid.uuid4())
    now_ist = get_ist_now()

    access_log = VisitorAccessLog(
        visitor_username=visitor.username,
        session_id=session_id,
        event_type="SUCCESSFUL_ACCESS",
        accessed_at=now_ist,
        created_at=now_ist
    )
    session.add(access_log)
    session.commit()
    session.refresh(access_log)

    logger.info(
        f"Visitor access granted for '{visitor.username}' (session_id={session_id}) at {now_ist.isoformat()}"
    )

    # Issue visitor credential (isolated from inspector JWTs)
    access_token = create_visitor_token(visitor.username, session_id)

    return VisitorTokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        username=visitor.username,
        session_id=session_id,
        role="visitor",
        accessed_at=format_ist_iso(now_ist)
    )

@router.get("/records", response_model=List[VisitorRecordItem])
def list_visitor_records(
    response: Response,
    zone_id: Optional[int] = Query(None, description="Optional zone ID filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    current_visitor: VisitorSession = Depends(get_current_visitor),
    session: Session = Depends(get_session)
):
    """
    GET /visitors/records: Returns permitted coating inspection records for an authorized visitor.
    Requires a valid visitor session. Does not create duplicate access logs on repeated fetches.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    service = InspectionService(session)
    inspections = service.list_inspections(zone_id=zone_id, skip=skip, limit=limit)

    records: List[VisitorRecordItem] = []
    for insp in inspections:
        has_topo = bool(insp.get("topology_available") or insp.get("mesh_url"))
        mesh_url = f"/api/v1/visitors/records/{insp['id']}/topology/file" if has_topo else None
        records.append(VisitorRecordItem(
            id=insp["id"],
            display_id=insp.get("display_id"),
            display_label=insp.get("display_label"),
            timestamp=str(insp.get("timestamp") or ""),
            zone_id=insp["zone_id"],
            zone_name=insp.get("zone_name") or f"Zone {insp['zone_id']}",
            overall_verdict=insp.get("overall_verdict") or "PENDING",
            status=insp.get("status") or "COMPLETED",
            image_url=insp.get("image_url"),
            thumbnail_url=insp.get("thumbnail_url"),
            mesh_url=mesh_url,
            defect_count=insp.get("defect_count", 0),
            image_count=insp.get("image_count", 1),
            topology_available=has_topo,
            topology_info=insp.get("topology_info"),
            evaluation_engine_version=insp.get("evaluation_engine_version") or "2.0.0-iso-aligned"
        ))

    logger.debug(f"Visitor '{current_visitor.username}' retrieved {len(records)} inspection records.")
    return records

@router.get("/records/{inspection_id}", response_model=VisitorRecordDetail)
def get_visitor_record_detail(
    inspection_id: int,
    response: Response,
    current_visitor: VisitorSession = Depends(get_current_visitor),
    session: Session = Depends(get_session)
):
    """
    GET /visitors/records/{id}: Retrieves detailed defect observations, bounding boxes,
    and standards grading for a specific inspection in read-only mode for authorized visitors.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    service = InspectionService(session)
    detail = service.get_inspection_detail(inspection_id)

    zone_data = detail.get("zone") or {}
    zone_name = zone_data.get("name") if isinstance(zone_data, dict) else f"Zone {detail.get('zone_id')}"
    detections = detail.get("detections") or []
    image_urls = detail.get("image_urls") or []
    has_topo = bool(detail.get("topology_available") or detail.get("mesh_url"))
    mesh_url = f"/api/v1/visitors/records/{inspection_id}/topology/file" if has_topo else None

    return VisitorRecordDetail(
        id=detail["id"],
        display_id=detail.get("display_id"),
        display_label=detail.get("display_label"),
        timestamp=str(detail.get("timestamp") or ""),
        zone_id=detail["zone_id"],
        zone_name=zone_name,
        zone=zone_data,
        overall_verdict=detail.get("overall_verdict") or "PENDING",
        status=detail.get("status") or "COMPLETED",
        preprocessing_version=detail.get("preprocessing_version") or "1.0.0",
        evaluation_engine_version=detail.get("evaluation_engine_version") or "2.0.0-iso-aligned",
        recalculated_at=detail.get("recalculated_at"),
        image_url=detail.get("image_url"),
        thumbnail_url=detail.get("thumbnail_url"),
        image_urls=image_urls,
        mesh_url=mesh_url,
        topology_available=has_topo,
        topology_info=detail.get("topology_info"),
        defect_count=len(detections),
        image_count=len(image_urls) if image_urls else 1,
        detections=detections,
        graded_results=detail.get("graded_results") or [],
        measurements=detail.get("measurements") or [],
        evaluation_summary=detail.get("evaluation_summary")
    )

@router.get("/records/{inspection_id}/topology/file")
def retrieve_visitor_topology_file(
    inspection_id: int,
    current_visitor: VisitorSession = Depends(get_current_visitor),
    session: Session = Depends(get_session)
):
    """
    GET /visitors/records/{inspection_id}/topology/file
    Streams the authenticated binary PLY topology data for Three.js rendering
    in authorized visitor read-only mode.
    Enforces that:
    1. Request has a valid visitor session.
    2. Inspection exists and is permitted.
    3. Topology artifact is linked to this inspection.
    4. Physical file is verified and strictly within topology storage vault.
    """
    inspection = session.get(Inspection, inspection_id)
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection #{inspection_id} not found."
        )

    topology = session.exec(
        select(TopologyFile).where(TopologyFile.inspection_id == inspection_id)
    ).first()

    if not topology:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No 3D surface topography associated with inspection #{inspection_id}."
        )

    file_path, sha256_hash = topology_storage.get_topology_file(inspection_id)
    if not file_path or not file_path.is_file():
        logger.error(f"Topology file missing from vault for inspection #{inspection_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topology PLY file missing from secure storage."
        )

    logger.info(
        f"Visitor '{current_visitor.username}' retrieved 3D topology mesh for inspection #{inspection_id}"
    )

    return FileResponse(
        path=str(file_path),
        media_type="application/octet-stream",
        filename=f"inspection_{inspection_id}_topology.ply",
        headers={
            "X-Topology-Hash": topology.file_hash,
            "X-Topology-Size": str(topology.file_size),
            "Cache-Control": "private, max-age=3600"
        }
    )

@router.get("/logs", response_model=VisitorLogsResponse)
def get_visitor_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    username: Optional[str] = Query(None, description="Filter logs by visitor username"),
    current_user: User = Depends(require_inspector),
    session: Session = Depends(get_session)
):
    """
    GET /visitors/logs: Retrieves chronological visitor activity audit log.
    Restricted to authenticated certified inspectors. Visitors cannot access this endpoint.
    """
    query = select(VisitorAccessLog)
    if username:
        query = query.where(VisitorAccessLog.visitor_username == username.strip())

    # Count total matching records
    count_query = select(func.count(VisitorAccessLog.id))
    if username:
        count_query = count_query.where(VisitorAccessLog.visitor_username == username.strip())
    total_count = session.exec(count_query).one()

    # Sort newest access first
    logs = session.exec(
        query.order_by(VisitorAccessLog.accessed_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    log_items: List[VisitorAccessLogItem] = []
    for l in logs:
        log_items.append(VisitorAccessLogItem(
            id=l.id,
            visitor_username=l.visitor_username,
            session_id=l.session_id,
            event_type=l.event_type,
            accessed_at=format_ist_iso(l.accessed_at) or "",
            created_at=format_ist_iso(l.created_at)
        ))

    logger.info(
        f"Inspector '{current_user.email}' retrieved {len(log_items)} visitor activity log entries."
    )

    page = (skip // limit) + 1 if limit > 0 else 1
    return VisitorLogsResponse(
        logs=log_items,
        total_count=total_count,
        page=page,
        limit=limit
    )
