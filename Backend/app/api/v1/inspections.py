"""Inspection API routes for specimen upload, defect results, and audit reports with strict RBAC."""

from typing import List, Optional
from fastapi import (
    APIRouter, Depends, UploadFile, File, Form, HTTPException, status,
    BackgroundTasks, Response
)
from sqlmodel import Session, select
import logging

from app.db.session import get_session
from app.services.inspection_service import InspectionService
from app.schemas.inspection import (
    InspectionCreateResponse, InspectionRead, InspectionDetail, InspectionStatusResponse
)
from app.api.deps import (
    get_current_user, require_inspector, require_viewer, require_admin
)
from app.models.user import User
from app.models.inspection import Inspection
from app.models.detection import Detection
from app.models.artifact import ProcessingArtifact
from app.models.report import InspectionReport
from app.models.topology import TopologyFile
from app.storage.local import storage
from app.storage.topology_storage import topology_storage
from app.reports.generator import generate_pdf_report

logger = logging.getLogger("dhatu_rakshana.api.inspections")

router = APIRouter(prefix="/inspections", tags=["inspections"])

@router.post("", response_model=InspectionCreateResponse, status_code=status.HTTP_201_CREATED)
@router.post("/upload", response_model=InspectionCreateResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_inspection(
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    images: List[UploadFile] = File(default=[]),
    zone_id: int = Form(...),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(require_inspector),
    session: Session = Depends(get_session)
):
    """
    POST /inspections: Ingests one or multiple coating specimen photos, runs detection,
    3D micro-topography, and standards grading, returning completed inspection results.
    Requires Inspector or Admin privileges.
    """
    upload_files: List[UploadFile] = []
    valid_images = [f for f in images if f and f.filename]
    if valid_images:
        upload_files = valid_images
    elif file and file.filename:
        upload_files = [file]
    elif image and image.filename:
        upload_files = [image]

    if not upload_files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required specimen image file(s). Upload at least one photo."
        )

    service = InspectionService(session)
    result = await service.ingest_and_create_inspection(
        upload_files=upload_files,
        zone_id=zone_id,
        inspector_id=current_user.id,
        background_tasks=background_tasks,
        run_synchronous=True
    )

    logger.info(f"Inspection #{result['inspection_id']} created by user {current_user.email} (Zone {zone_id})")

    return InspectionCreateResponse(
        id=result["inspection_id"],
        inspection_id=result["inspection_id"],
        overall_verdict=result["overall_verdict"],
        image_count=result["image_count"],
        status=result["status"],
        job_id=result.get("job_id")
    )

@router.get("", response_model=List[InspectionRead])
def list_inspections(
    zone_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_viewer),
    session: Session = Depends(get_session)
):
    """
    GET /inspections: Returns ordered history of past coating inspections.
    Protected: requires authenticated user.
    """
    service = InspectionService(session)
    return service.list_inspections(zone_id=zone_id, skip=skip, limit=limit)

@router.get("/history", response_model=List[InspectionRead])
def get_inspection_history(
    zone_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_viewer),
    session: Session = Depends(get_session)
):
    """
    GET /inspections/history: Canonical protected alias for analysis history.
    Protected: requires authenticated user.
    """
    service = InspectionService(session)
    return service.list_inspections(zone_id=zone_id, skip=skip, limit=limit)

@router.get("/{inspection_id}", response_model=InspectionDetail)
def get_inspection_detail(
    inspection_id: int,
    current_user: User = Depends(require_viewer),
    session: Session = Depends(get_session)
):
    """
    GET /inspections/{id}: Retrieves detailed defect bounding boxes, 3D mesh, and grading matrix.
    Protected: requires authenticated user.
    """
    service = InspectionService(session)
    return service.get_inspection_detail(inspection_id)

@router.get("/{inspection_id}/status", response_model=InspectionStatusResponse)
def get_inspection_status(
    inspection_id: int,
    current_user: User = Depends(require_viewer),
    session: Session = Depends(get_session)
):
    """
    GET /inspections/{id}/status: Returns real-time processing status and progress.
    Protected: requires authenticated user.
    """
    service = InspectionService(session)
    return service.get_status(inspection_id)

@router.get("/{inspection_id}/report")
def download_inspection_report(
    inspection_id: int,
    current_user: User = Depends(require_viewer),
    session: Session = Depends(get_session)
):
    """
    GET /inspections/{id}/report: Streams or generates authoritative inspection PDF report.
    Protected: requires authenticated user.
    """
    service = InspectionService(session)
    insp_data = service.get_inspection_detail(inspection_id)

    # Check if pre-generated report exists
    existing_report = session.exec(
        select(InspectionReport).where(InspectionReport.inspection_id == inspection_id)
    ).first()

    if existing_report and storage.exists(existing_report.storage_key):
        pdf_bytes = storage.read_bytes(existing_report.storage_key)
    else:
        pdf_bytes = generate_pdf_report(insp_data)
        # Store for future requests
        key, _, csum = storage.save_bytes(
            pdf_bytes,
            filename=f"dhatu-rakshana-report-{inspection_id}.pdf",
            subfolder="reports"
        )
        new_report = InspectionReport(
            inspection_id=inspection_id,
            report_title=f"Coating Defect Audit Report #{inspection_id}",
            storage_key=key,
            file_size_bytes=len(pdf_bytes),
            checksum_sha256=csum
        )
        session.add(new_report)
        session.commit()

    logger.info(f"Report downloaded for inspection #{inspection_id} by user {current_user.email}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="dhatu-rakshana-report-{inspection_id}.pdf"',
            "Content-Length": str(len(pdf_bytes))
        }
    )

@router.get("/{inspection_id}/detections")
def get_inspection_detections(
    inspection_id: int,
    current_user: User = Depends(require_viewer),
    session: Session = Depends(get_session)
):
    """GET /inspections/{id}/detections: Retrieves localized defect records."""
    detections = session.exec(
        select(Detection).where(Detection.inspection_id == inspection_id)
    ).all()
    return [d.to_dict() for d in detections]

@router.get("/{inspection_id}/artifacts")
def get_inspection_artifacts(
    inspection_id: int,
    current_user: User = Depends(require_viewer),
    session: Session = Depends(get_session)
):
    """GET /inspections/{id}/artifacts: Lists stored mesh, image, and report artifacts."""
    artifacts = session.exec(
        select(ProcessingArtifact).where(ProcessingArtifact.inspection_id == inspection_id)
    ).all()
    return [a.to_dict() for a in artifacts]

@router.delete("/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inspection(
    inspection_id: int,
    current_user: User = Depends(require_inspector),
    session: Session = Depends(get_session)
):
    """
    DELETE /inspections/{id}: Deletes inspection record, linked topology file, and associated data.
    Requires Inspector (for own inspection) or Admin.
    """
    insp = session.get(Inspection, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail=f"Inspection #{inspection_id} not found.")

    if current_user.role != "admin" and insp.inspector_id and insp.inspector_id != current_user.id:
        logger.warning(f"User {current_user.email} forbidden to delete inspection #{inspection_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to delete this inspection."
        )

    # 1. Clean up associated topology file record if exists
    topo = session.exec(
        select(TopologyFile).where(TopologyFile.inspection_id == inspection_id)
    ).first()
    if topo:
        session.delete(topo)

    # 2. Clean up physical PLY file on filesystem safely
    topology_storage.delete_topology(inspection_id)

    # 3. Delete inspection record
    session.delete(insp)
    session.commit()

    logger.info(f"Inspection #{inspection_id} and all associated topology data deleted by {current_user.email}")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
