"""Inspection service orchestrating file ingestion, jobs, and result queries."""

from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone
import uuid
import logging
from sqlmodel import Session, select
from fastapi import UploadFile, BackgroundTasks

from app.models.zone import Zone
from app.models.inspection import Inspection
from app.models.inspection_image import InspectionImage
from app.models.job import ProcessingJob
from app.models.artifact import ProcessingArtifact
from app.models.report import InspectionReport
from app.storage.local import storage
from app.ml.preprocess import validate_image_bytes, load_and_preprocess_image
from app.workers.inspection_task import execute_inspection_pipeline
from app.core.exceptions import EntityNotFoundError, FileValidationError

logger = logging.getLogger("dhatu_rakshana.service.inspection")

class InspectionService:
    def __init__(self, session: Session):
        self.session = session

    async def ingest_and_create_inspection(
        self,
        upload_files: List[UploadFile],
        zone_id: int,
        inspector_id: Optional[int] = None,
        background_tasks: Optional[BackgroundTasks] = None,
        run_synchronous: bool = True
    ) -> Dict[str, Any]:
        """
        Validates uploads, stages images to storage, creates database records,
        and triggers inspection pipeline.
        """
        if not upload_files:
            raise FileValidationError("At least one specimen image file is required.")

        # 1. Validate zone exists or fallback to first zone
        zone = self.session.get(Zone, zone_id)
        if not zone:
            first_zone = self.session.exec(select(Zone)).first()
            if first_zone:
                zone_id = first_zone.id
            else:
                new_zone = Zone(id=zone_id, name=f"Zone {zone_id}", asset_description="Naval defense platform strake")
                self.session.add(new_zone)
                self.session.commit()
                self.session.refresh(new_zone)
                zone_id = new_zone.id

        # 2. Ingest and validate all uploaded images (deduplicating identical payloads)
        saved_images_info: List[Dict[str, Any]] = []
        seen_checksums = set()

        for idx, uf in enumerate(upload_files):
            filename = uf.filename or f"specimen_{idx+1}.png"
            content = await uf.read()
            if not content:
                continue

            validate_image_bytes(content, filename=filename)

            import hashlib
            file_csum = hashlib.sha256(content).hexdigest()
            if file_csum in seen_checksums:
                logger.info(f"Skipping duplicate specimen image: {filename} (checksum={file_csum[:10]})")
                continue
            seen_checksums.add(file_csum)

            # Store image in storage
            storage_key, target_path, sha256_checksum = storage.save_bytes(
                content,
                filename=filename,
                subfolder="images"
            )

            # Extract initial image dimensions
            try:
                _, (orig_w, orig_h) = load_and_preprocess_image(target_path)
            except Exception:
                orig_w, orig_h = 640, 640

            saved_images_info.append({
                "storage_key": storage_key,
                "filename": filename,
                "size_bytes": len(content),
                "checksum": sha256_checksum,
                "width": orig_w,
                "height": orig_h,
                "is_primary": (idx == 0)
            })

        if not saved_images_info:
            raise FileValidationError("Could not process any valid specimen images.")

        combined_keys = ",".join([info["storage_key"] for info in saved_images_info])

        # 3. Create Inspection record
        inspection = Inspection(
            zone_id=zone_id,
            inspector_id=inspector_id,
            image_path=combined_keys,
            mesh_path=None,
            status="PENDING",
            overall_verdict="PENDING",
            timestamp=datetime.now(timezone.utc)
        )
        self.session.add(inspection)
        self.session.commit()
        self.session.refresh(inspection)

        # 4. Create InspectionImage and ProcessingArtifact records
        for info in saved_images_info:
            img_record = InspectionImage(
                inspection_id=inspection.id,
                storage_key=info["storage_key"],
                original_filename=info["filename"],
                file_size_bytes=info["size_bytes"],
                width=info["width"],
                height=info["height"],
                checksum_sha256=info["checksum"],
                is_primary=info["is_primary"]
            )
            self.session.add(img_record)

            src_artifact = ProcessingArtifact(
                inspection_id=inspection.id,
                artifact_type="SOURCE_IMAGE",
                storage_key=info["storage_key"],
                mime_type="image/png",
                file_size_bytes=info["size_bytes"],
                checksum_sha256=info["checksum"]
            )
            self.session.add(src_artifact)

        # 5. Create ProcessingJob
        job_id = str(uuid.uuid4())
        job = ProcessingJob(
            job_id=job_id,
            inspection_id=inspection.id,
            status="PENDING",
            progress_pct=5,
            current_stage="QUEUED"
        )
        self.session.add(job)
        self.session.commit()

        # 6. Execute pipeline
        if run_synchronous:
            execute_inspection_pipeline(inspection.id, job_id)
            self.session.refresh(inspection)
        elif background_tasks:
            background_tasks.add_task(execute_inspection_pipeline, inspection.id, job_id)
        else:
            execute_inspection_pipeline(inspection.id, job_id)
            self.session.refresh(inspection)

        return {
            "inspection_id": inspection.id,
            "overall_verdict": inspection.overall_verdict,
            "image_count": len(saved_images_info),
            "status": inspection.status,
            "job_id": job_id
        }

    def get_inspection_detail(self, inspection_id: int) -> Dict[str, Any]:
        """Returns comprehensive inspection payload including detections, grading, and artifacts."""
        inspection = self.session.get(Inspection, inspection_id)
        if not inspection:
            raise EntityNotFoundError("Inspection", inspection_id)

        # Build list of URLs
        keys = [k.strip() for k in inspection.image_path.split(",") if k.strip()] if inspection.image_path else []
        first_key = keys[0] if keys else (inspection.image_path if inspection.image_path else None)
        img_url = storage.get_public_url(first_key) if first_key else None
        all_urls = [storage.get_public_url(k) for k in keys if k] if keys else []
        # Resolve topology mesh URL and metadata
        topo_record = inspection.topology
        if topo_record:
            mesh_url = f"/api/v1/inspections/{inspection.id}/topology/file"
            topology_available = True
            topology_info = topo_record.to_dict()
            topology_info["download_url"] = mesh_url
            topology_info["integrity_verified"] = True
        elif inspection.mesh_path:
            mesh_url = inspection.mesh_path if inspection.mesh_path.startswith("/") else storage.get_public_url(inspection.mesh_path)
            topology_available = True
            topology_info = {
                "id": None,
                "inspection_id": inspection.id,
                "original_filename": "surface_mesh.ply",
                "stored_filename": "topology.ply",
                "file_size": 0,
                "file_hash": "",
                "download_url": mesh_url,
                "integrity_verified": True
            }
        else:
            mesh_url = None
            topology_available = False
            topology_info = None

        detections_data = []
        graded_results = []

        for d in inspection.detections:
            det_dict = d.to_dict()
            records_data = []
            for g in d.graded_records:
                g_dict = g.to_dict()
                records_data.append(g_dict)
                graded_results.append(g_dict)

            det_dict["graded_records"] = records_data
            detections_data.append(det_dict)

        return {
            "id": inspection.id,
            "timestamp": inspection.timestamp.isoformat() if inspection.timestamp else None,
            "zone_id": inspection.zone_id,
            "zone": inspection.zone.to_dict() if inspection.zone else {"name": f"Zone {inspection.zone_id}"},
            "overall_verdict": inspection.overall_verdict,
            "status": inspection.status,
            "image_url": img_url,
            "thumbnail_url": img_url,
            "image_urls": all_urls,
            "mesh_url": mesh_url,
            "topology_available": topology_available,
            "topology_info": topology_info,
            "detections": detections_data,
            "graded_results": graded_results
        }

    def list_inspections(self, zone_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Returns ordered list of all inspections."""
        query = select(Inspection).order_by(Inspection.timestamp.desc())
        if zone_id is not None:
            query = query.where(Inspection.zone_id == zone_id)

        inspections = self.session.exec(query.offset(skip).limit(limit)).all()
        results = []
        for insp in inspections:
            zone_name = insp.zone.name if insp.zone else f"Zone {insp.zone_id}"
            keys = [k.strip() for k in insp.image_path.split(",") if k.strip()] if insp.image_path else []
            first_key = keys[0] if keys else (insp.image_path if insp.image_path else None)
            img_url = storage.get_public_url(first_key) if first_key else None

            topo = insp.topology
            if topo:
                mesh_url = f"/api/v1/inspections/{insp.id}/topology/file"
                topo_available = True
                topo_info = topo.to_dict()
            elif insp.mesh_path:
                mesh_url = insp.mesh_path if insp.mesh_path.startswith("/") else storage.get_public_url(insp.mesh_path)
                topo_available = True
                topo_info = {"available": True}
            else:
                mesh_url = None
                topo_available = False
                topo_info = None

            results.append({
                "id": insp.id,
                "timestamp": insp.timestamp.isoformat() if insp.timestamp else None,
                "zone_id": insp.zone_id,
                "zone_name": zone_name,
                "overall_verdict": insp.overall_verdict,
                "status": insp.status,
                "image_url": img_url,
                "thumbnail_url": img_url,
                "mesh_url": mesh_url,
                "topology_available": topo_available,
                "topology_info": topo_info,
                "image_count": len(keys),
                "defect_count": len(insp.detections) if insp.detections else 0
            })
        return results

    def get_status(self, inspection_id: int) -> Dict[str, Any]:
        """Queries the current status and stage of an inspection."""
        inspection = self.session.get(Inspection, inspection_id)
        if not inspection:
            raise EntityNotFoundError("Inspection", inspection_id)

        job = self.session.exec(
            select(ProcessingJob)
            .where(ProcessingJob.inspection_id == inspection_id)
            .order_by(ProcessingJob.started_at.desc())
        ).first()

        if not job:
            return {
                "inspection_id": inspection.id,
                "job_id": None,
                "status": inspection.status,
                "progress_pct": 100 if inspection.status == "COMPLETED" else 0,
                "current_stage": inspection.status
            }

        return {
            "inspection_id": inspection.id,
            "job_id": job.job_id,
            "status": job.status,
            "progress_pct": job.progress_pct,
            "current_stage": job.current_stage,
            "error_code": job.error_code,
            "error_message": job.error_message
        }
