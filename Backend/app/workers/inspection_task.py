"""Worker task orchestrating the complete end-to-end inspection pipeline."""

import tempfile
from pathlib import Path
from datetime import datetime, timezone
import logging
from sqlmodel import Session, select
from PIL import Image

from app.db.session import engine
from app.models.inspection import Inspection
from app.models.inspection_image import InspectionImage
from app.models.detection import Detection
from app.models.measurement import DefectMeasurement
from app.models.grading import GradedDefectRecord
from app.models.job import ProcessingJob
from app.models.artifact import ProcessingArtifact
from app.models.report import InspectionReport
from app.models.topology import TopologyFile
from app.storage.local import storage
from app.storage.topology_storage import topology_storage
from app.ml.registry import model_registry
from app.ml.preprocess import load_and_preprocess_image, PREPROCESSING_VERSION
from app.vision.measurement.service import compute_defect_measurements
from app.vision.reconstruction.service import reconstruct_surface_mesh
from app.standards.engine import standards_engine
from app.reports.generator import generate_pdf_report
from app.core.logging import log_stage_timing

logger = logging.getLogger("dhatu_rakshana.pipeline")

def execute_inspection_pipeline(inspection_id: int, job_id: str) -> None:
    """Executes the full inspection workflow asynchronously."""
    with Session(engine) as session:
        inspection = session.get(Inspection, inspection_id)
        job = session.exec(select(ProcessingJob).where(ProcessingJob.job_id == job_id)).first()

        if not inspection or not job:
            logger.error(f"Pipeline abort: Inspection #{inspection_id} or Job '{job_id}' not found.")
            return

        def update_job(stage: str, progress: int, status: str = "PROCESSING"):
            job.current_stage = stage
            job.progress_pct = progress
            job.status = status
            session.add(job)
            session.commit()

        try:
            # -------------------------------------------------------------
            # Stage 1: VALIDATING
            # -------------------------------------------------------------
            with log_stage_timing("VALIDATING", inspection_id):
                update_job("VALIDATING", 10)
                images = session.exec(select(InspectionImage).where(InspectionImage.inspection_id == inspection_id)).all()
                if not images:
                    raise ValueError(f"No specimen images associated with inspection #{inspection_id}.")

                primary_img_record = next((img for img in images if img.is_primary), images[0])
                primary_abs_path = storage.get_absolute_path(primary_img_record.storage_key)
                if not primary_abs_path.exists():
                    raise FileNotFoundError(f"Primary image missing at storage location: {primary_abs_path}")

            # -------------------------------------------------------------
            # Stage 2: PREPROCESSING
            # -------------------------------------------------------------
            with log_stage_timing("PREPROCESSING", inspection_id):
                update_job("PREPROCESSING", 20)
                primary_img_np, (img_w, img_h) = load_and_preprocess_image(primary_abs_path)
                primary_img_record.width = img_w
                primary_img_record.height = img_h
                session.add(primary_img_record)
                session.commit()

            # -------------------------------------------------------------
            # Stage 3: DETECTING (ML / CV Inference)
            # -------------------------------------------------------------
            with log_stage_timing("DETECTING", inspection_id):
                update_job("DETECTING", 40)
                model_runner = model_registry.get_model()
                inference_result = model_runner.predict(primary_img_np, confidence_threshold=0.45)
                logger.info(
                    f"Model '{inference_result.model_name}' ({inference_result.framework}) "
                    f"identified {len(inference_result.detections)} candidate defects in {inference_result.inference_time_ms}ms."
                )

            # -------------------------------------------------------------
            # Stage 4: MEASURING (Geometry & 3D Depth Proxy)
            # -------------------------------------------------------------
            with log_stage_timing("MEASURING", inspection_id):
                update_job("MEASURING", 60)
                measured_items = []
                for det in inference_result.detections:
                    meas = compute_defect_measurements(
                        bbox=det.bbox,
                        image_width=img_w,
                        image_height=img_h,
                        image_np=primary_img_np
                    )
                    # Update candidate with calculated area percentage
                    det.area_pct = meas["area_pct"]
                    measured_items.append({"candidate": det, "measurements": meas})

            # -------------------------------------------------------------
            # Stage 5: MAPPING (3D Micro-Topography Reconstruction via Open3D)
            # -------------------------------------------------------------
            mesh_storage_key = None
            mesh_artifact_id = None
            with log_stage_timing("MAPPING", inspection_id):
                update_job("MAPPING", 75)
                all_abs_paths = [storage.get_absolute_path(img.storage_key) for img in images]
                with tempfile.TemporaryDirectory() as tmp_dir:
                    recon_res = reconstruct_surface_mesh(
                        image_paths=all_abs_paths,
                        output_dir=Path(tmp_dir),
                        base_filename=f"surface_mesh_{inspection_id}"
                    )
                    if recon_res.get("success") and recon_res.get("ply_path"):
                        ply_path = Path(recon_res["ply_path"])

                        # 1. Save to persistent topology storage under storage/topology/<inspection_id>/topology.ply
                        try:
                            topo_meta = topology_storage.save_from_file_path(
                                inspection_id=inspection_id,
                                src_path=ply_path,
                                original_filename=f"surface_mesh_{inspection_id}.ply"
                            )
                            existing_topo = session.exec(
                                select(TopologyFile).where(TopologyFile.inspection_id == inspection_id)
                            ).first()
                            now = datetime.now(timezone.utc)
                            if existing_topo:
                                existing_topo.original_filename = topo_meta["original_filename"]
                                existing_topo.stored_filename = topo_meta["stored_filename"]
                                existing_topo.storage_path = topo_meta["storage_path"]
                                existing_topo.file_size = topo_meta["file_size"]
                                existing_topo.file_hash = topo_meta["file_hash"]
                                existing_topo.updated_at = now
                                session.add(existing_topo)
                            else:
                                topo_record = TopologyFile(
                                    inspection_id=inspection_id,
                                    original_filename=topo_meta["original_filename"],
                                    stored_filename=topo_meta["stored_filename"],
                                    storage_path=topo_meta["storage_path"],
                                    file_size=topo_meta["file_size"],
                                    file_hash=topo_meta["file_hash"],
                                    created_at=now,
                                    updated_at=now
                                )
                                session.add(topo_record)
                            session.commit()
                            logger.info(f"TopologyFile record persisted for inspection #{inspection_id}")
                        except Exception as topo_err:
                            logger.error(f"Failed to persist topology file for inspection #{inspection_id}: {topo_err}")

                        # 2. Register legacy artifact for compatibility
                        mesh_storage_key, _, mesh_sha256 = storage.save_file_from_path(
                            ply_path,
                            filename=f"surface_mesh_{inspection_id}.ply",
                            subfolder="meshes"
                        )
                        mesh_artifact = ProcessingArtifact(
                            inspection_id=inspection_id,
                            artifact_type="MESH_PLY",
                            storage_key=mesh_storage_key,
                            mime_type="application/octet-stream",
                            file_size_bytes=ply_path.stat().st_size,
                            checksum_sha256=mesh_sha256
                        )
                        session.add(mesh_artifact)
                        session.commit()
                        session.refresh(mesh_artifact)
                        mesh_artifact_id = mesh_artifact.id

            # -------------------------------------------------------------
            # Stage 6: GRADING (AMPP / NACE / SSPC / ISO Standards Evaluation)
            # -------------------------------------------------------------
            graded_results = []
            with log_stage_timing("GRADING", inspection_id):
                update_job("GRADING", 85)
                for item in measured_items:
                    cand = item["candidate"]
                    grade_res = standards_engine.grade_detection(
                        subtype=cand.subtype,
                        area_pct=cand.area_pct,
                        confidence=cand.confidence
                    )
                    cand.severity = grade_res["severity"]
                    graded_results.append(grade_res)
                    item["grade"] = grade_res

                overall_verdict = standards_engine.determine_overall_verdict(graded_results)

            # -------------------------------------------------------------
            # Persist Detections, Measurements & Grading to Database
            # -------------------------------------------------------------
            inspection.mesh_path = f"/api/v1/inspections/{inspection_id}/topology/file" if mesh_artifact_id else None
            inspection.overall_verdict = overall_verdict
            inspection.preprocessing_version = PREPROCESSING_VERSION
            session.add(inspection)
            session.commit()

            created_detections_for_report = []

            for item in measured_items:
                cand = item["candidate"]
                meas = item["measurements"]
                gr = item["grade"]

                det_record = Detection(
                    inspection_id=inspection.id,
                    image_id=primary_img_record.id,
                    class_name=cand.class_name,
                    subtype=cand.subtype,
                    bbox_raw="",
                    confidence=cand.confidence,
                    area_pct=cand.area_pct,
                    severity=cand.severity
                )
                det_record.bbox = cand.bbox
                session.add(det_record)
                session.commit()
                session.refresh(det_record)

                # Persist measurements
                meas_record = DefectMeasurement(
                    detection_id=det_record.id,
                    bbox_width=meas["bbox_width"],
                    bbox_height=meas["bbox_height"],
                    aspect_ratio=meas["aspect_ratio"],
                    pixel_area=meas["pixel_area"],
                    area_pct=meas["area_pct"],
                    centroid_x=meas["centroid_x"],
                    centroid_y=meas["centroid_y"],
                    surface_depth_proxy=meas["surface_depth_proxy"],
                    roughness_index=meas["roughness_index"]
                )
                session.add(meas_record)

                # Persist graded record
                grade_record = GradedDefectRecord(
                    detection_id=det_record.id,
                    standard_reference=gr["standard_reference"],
                    rule_version=gr["rule_version"],
                    severity=gr["severity"],
                    pass_fail=gr["pass_fail"],
                    notes=gr.get("notes")
                )
                session.add(grade_record)
                session.commit()

                det_dict = det_record.to_dict()
                det_dict["graded_records"] = [grade_record.to_dict()]
                created_detections_for_report.append(det_dict)

            # -------------------------------------------------------------
            # Stage 7: REPORTING (Generate PDF Audit Report)
            # -------------------------------------------------------------
            with log_stage_timing("REPORTING", inspection_id):
                update_job("REPORTING", 95)
                report_context = {
                    "id": inspection.id,
                    "zone_id": inspection.zone_id,
                    "zone": inspection.zone.to_dict() if inspection.zone else {"name": f"Zone {inspection.zone_id}"},
                    "overall_verdict": inspection.overall_verdict,
                    "timestamp": inspection.timestamp.isoformat() if inspection.timestamp else datetime.now(timezone.utc).isoformat(),
                    "image_url": storage.get_public_url(primary_img_record.storage_key),
                    "mesh_url": storage.get_public_url(mesh_storage_key) if mesh_storage_key else None,
                    "detections": created_detections_for_report,
                    "graded_results": [g.to_dict() for g in session.exec(select(GradedDefectRecord).join(Detection).where(Detection.inspection_id == inspection.id)).all()]
                }

                pdf_bytes = generate_pdf_report(report_context)
                report_key, _, report_sha256 = storage.save_bytes(
                    pdf_bytes,
                    filename=f"dhatu-rakshana-report-{inspection.id}.pdf",
                    subfolder="reports"
                )

                # Save report record
                insp_report = InspectionReport(
                    inspection_id=inspection.id,
                    report_title=f"Coating Defect Audit Report #{inspection.id}",
                    storage_key=report_key,
                    file_size_bytes=len(pdf_bytes),
                    checksum_sha256=report_sha256
                )
                session.add(insp_report)

                # Save artifact record
                report_artifact = ProcessingArtifact(
                    inspection_id=inspection.id,
                    artifact_type="PDF_REPORT",
                    storage_key=report_key,
                    mime_type="application/pdf",
                    file_size_bytes=len(pdf_bytes),
                    checksum_sha256=report_sha256
                )
                session.add(report_artifact)
                session.commit()

            # Mark inspection & job COMPLETED
            inspection.status = "COMPLETED"
            session.add(inspection)

            job.status = "COMPLETED"
            job.current_stage = "COMPLETED"
            job.progress_pct = 100
            job.completed_at = datetime.now(timezone.utc)
            session.add(job)
            session.commit()

            logger.info(f"Inspection #{inspection_id} successfully completed all processing stages.")

        except Exception as exc:
            logger.error(f"Inspection #{inspection_id} failed during stage '{job.current_stage}': {exc}", exc_info=True)
            inspection.status = "FAILED"
            session.add(inspection)

            job.status = "FAILED"
            job.error_code = type(exc).__name__
            job.error_message = str(exc)
            job.completed_at = datetime.now(timezone.utc)
            session.add(job)
            session.commit()
