"""API endpoints for 3D micro-topography PLY mesh upload, retrieval, and lifecycle management."""

from pathlib import Path
from typing import Optional
from fastapi import (
    APIRouter, Depends, UploadFile, File, HTTPException, status, Response
)
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from datetime import datetime, timezone
import logging

from app.db.session import get_session
from app.models.user import User
from app.models.inspection import Inspection
from app.models.topology import TopologyFile
from app.schemas.topology import TopologyRead, TopologyUploadResponse, TopologyDetail
from app.api.deps import get_current_user, require_inspector, require_viewer, require_admin
from app.storage.topology_storage import topology_storage

logger = logging.getLogger("dhatu_rakshana.api.topology")

router = APIRouter(tags=["topology"])

@router.post(
    "/inspections/{inspection_id}/topology",
    response_model=TopologyUploadResponse,
    status_code=status.HTTP_201_CREATED
)
async def upload_inspection_topology(
    inspection_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_inspector),
    session: Session = Depends(get_session)
):
    """
    POST /inspections/{inspection_id}/topology
    Uploads, validates, hashes, and links a 3D PLY micro-topography mesh to an inspection.
    Requires Inspector or Admin privileges.
    """
    inspection = session.get(Inspection, inspection_id)
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection #{inspection_id} not found."
        )

    # Authorization: inspector can only modify inspections they are assigned to, or admin can modify any
    if current_user.role != "admin" and inspection.inspector_id and inspection.inspector_id != current_user.id:
        logger.warning(
            f"User {current_user.email} unauthorized to upload topology to inspection #{inspection_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to modify this inspection's topology."
        )

    # Read uploaded bytes
    try:
        data = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {exc}"
        )

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file payload is empty."
        )

    # Validate PLY format and geometry
    is_valid, validation_err = topology_storage.validate_ply_content(data)
    if not is_valid:
        logger.warning(
            f"Topology integrity validation failed for inspection #{inspection_id}: {validation_err}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid PLY file: {validation_err}"
        )

    # Save to managed filesystem storage
    try:
        storage_meta = topology_storage.save_topology(
            inspection_id=inspection_id,
            data=data,
            original_filename=file.filename or "topology.ply"
        )
    except Exception as exc:
        logger.error(f"Failed to write topology file for inspection #{inspection_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist topology file: {exc}"
        )

    # Synchronize database record within transactional block
    try:
        existing_topology = session.exec(
            select(TopologyFile).where(TopologyFile.inspection_id == inspection_id)
        ).first()

        now = datetime.now(timezone.utc)
        if existing_topology:
            existing_topology.original_filename = storage_meta["original_filename"]
            existing_topology.stored_filename = storage_meta["stored_filename"]
            existing_topology.storage_path = storage_meta["storage_path"]
            existing_topology.file_size = storage_meta["file_size"]
            existing_topology.file_hash = storage_meta["file_hash"]
            existing_topology.updated_at = now
            session.add(existing_topology)
            topology_record = existing_topology
        else:
            topology_record = TopologyFile(
                inspection_id=inspection_id,
                original_filename=storage_meta["original_filename"],
                stored_filename=storage_meta["stored_filename"],
                storage_path=storage_meta["storage_path"],
                file_size=storage_meta["file_size"],
                file_hash=storage_meta["file_hash"],
                created_at=now,
                updated_at=now
            )
            session.add(topology_record)

        # Update inspection mesh reference to internal authenticated endpoint
        inspection.mesh_path = f"/api/v1/inspections/{inspection_id}/topology/file"
        session.add(inspection)
        session.commit()
        session.refresh(topology_record)

        logger.info(
            f"Topology uploaded and linked: ID={topology_record.id}, "
            f"inspection_id={inspection_id}, size={topology_record.file_size}"
        )

        return TopologyUploadResponse(
            id=topology_record.id,
            inspection_id=topology_record.inspection_id,
            filename=topology_record.stored_filename,
            file_size=topology_record.file_size,
            sha256=topology_record.file_hash,
            created_at=topology_record.created_at
        )

    except Exception as exc:
        session.rollback()
        # Roll back physical file to prevent orphan
        topology_storage.delete_topology(inspection_id)
        logger.error(
            f"Database error while saving topology record for inspection #{inspection_id}: {exc}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record topology in database. Rolled back storage."
        )

@router.get(
    "/inspections/{inspection_id}/topology",
    response_model=TopologyDetail
)
def get_inspection_topology_metadata(
    inspection_id: int,
    current_user: User = Depends(require_viewer),
    session: Session = Depends(get_session)
):
    """
    GET /inspections/{inspection_id}/topology
    Retrieves metadata for an inspection's 3D PLY micro-topography file.
    Does NOT expose absolute internal filesystem paths.
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
            detail=f"No 3D micro-topography file associated with inspection #{inspection_id}."
        )

    # Verify physical file integrity
    integrity_ok = topology_storage.verify_integrity(inspection_id, topology.file_hash)

    return TopologyDetail(
        id=topology.id,
        inspection_id=topology.inspection_id,
        original_filename=topology.original_filename,
        stored_filename=topology.stored_filename,
        file_size=topology.file_size,
        file_hash=topology.file_hash,
        created_at=topology.created_at,
        updated_at=topology.updated_at,
        download_url=f"/api/v1/inspections/{inspection_id}/topology/file",
        integrity_verified=integrity_ok
    )

@router.get("/inspections/{inspection_id}/topology/file")
def retrieve_inspection_topology_file(
    inspection_id: int,
    current_user: User = Depends(require_viewer),
    session: Session = Depends(get_session)
):
    """
    GET /inspections/{inspection_id}/topology/file
    Streams the authenticated binary PLY topology data for Three.js rendering or download.
    Enforces authentication and authorization. Does not expose direct directory URLs.
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
            detail=f"No topology record found for inspection #{inspection_id}."
        )

    file_path, sha256_hash = topology_storage.get_topology_file(inspection_id)
    if not file_path or not file_path.is_file():
        logger.error(f"Topology file missing from disk for inspection #{inspection_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topology PLY file missing from secure storage."
        )

    logger.info(f"Topology retrieved for inspection #{inspection_id} by user {current_user.email}")

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

@router.get("/topology/{topology_id}")
def retrieve_topology_by_id(
    topology_id: int,
    current_user: User = Depends(require_viewer),
    session: Session = Depends(get_session)
):
    """
    GET /topology/{topology_id}
    Retrieves and streams PLY file by topology record ID.
    """
    topology = session.get(TopologyFile, topology_id)
    if not topology:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topology record #{topology_id} not found."
        )

    file_path, _ = topology_storage.get_topology_file(topology.inspection_id)
    if not file_path or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topology PLY file missing from secure storage."
        )

    logger.info(f"Topology retrieved (by ID #{topology_id}) by user {current_user.email}")

    return FileResponse(
        path=str(file_path),
        media_type="application/octet-stream",
        filename=f"inspection_{topology.inspection_id}_topology.ply",
        headers={
            "X-Topology-Hash": topology.file_hash,
            "X-Topology-Size": str(topology.file_size)
        }
    )

@router.delete("/topology/{topology_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topology_by_id(
    topology_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    DELETE /topology/{topology_id}
    Deletes topology database record and physical PLY file from disk.
    Requires Administrator privileges.
    """
    topology = session.get(TopologyFile, topology_id)
    if not topology:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topology record #{topology_id} not found."
        )

    insp_id = topology.inspection_id
    session.delete(topology)

    # Also update inspection mesh_path if pointing to this
    inspection = session.get(Inspection, insp_id)
    if inspection and inspection.mesh_path and "topology" in inspection.mesh_path:
        inspection.mesh_path = None
        session.add(inspection)

    session.commit()

    # Clean up physical file
    topology_storage.delete_topology(insp_id)
    logger.info(f"Topology deleted for inspection #{insp_id} (record #{topology_id}) by admin {current_user.email}")

    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.delete("/inspections/{inspection_id}/topology", status_code=status.HTTP_204_NO_CONTENT)
def delete_inspection_topology(
    inspection_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    DELETE /inspections/{inspection_id}/topology
    Deletes topology file and metadata for a given inspection.
    Requires Administrator privileges.
    """
    topology = session.exec(
        select(TopologyFile).where(TopologyFile.inspection_id == inspection_id)
    ).first()

    if not topology:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No topology record found for inspection #{inspection_id}."
        )

    session.delete(topology)

    inspection = session.get(Inspection, inspection_id)
    if inspection and inspection.mesh_path and "topology" in inspection.mesh_path:
        inspection.mesh_path = None
        session.add(inspection)

    session.commit()

    topology_storage.delete_topology(inspection_id)
    logger.info(f"Topology deleted for inspection #{inspection_id} by admin {current_user.email}")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
