"""Administrative Historical Recalculation Engine for Marine Coating Inspections.

Brings all existing inspection evaluations up to date using the ISO-aligned evaluation engine.
Features:
- Safe, transactional, idempotent backfill.
- Comprehensive evaluation preservation in evaluation_histories.
- Dry-run mode for pre-flight verification.
- Individual inspection targeting (--inspection-id).
- Regeneration of authoritative PDF audit reports.
- Non-destructive: preserves original timestamps, ownership, images, and topology.
"""

import sys
import os
import argparse
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

# Setup paths
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
project_root = backend_dir.parent
sys.path.insert(0, str(project_root))

from sqlmodel import Session, select
from PIL import Image

from app.core.timezone import get_ist_now, format_ist_iso, format_ist_display
from app.db.session import engine
from app.models.inspection import Inspection
from app.models.inspection_image import InspectionImage
from app.models.detection import Detection
from app.models.measurement import DefectMeasurement
from app.models.grading import GradedDefectRecord
from app.models.topology import TopologyFile
from app.models.report import InspectionReport
from app.models.artifact import ProcessingArtifact
from app.models.evaluation import InspectionMeasurement, EvaluationHistory
from app.standards.iso_evaluator import iso_evaluation_engine, EVALUATION_ENGINE_VERSION
from app.standards.engine import standards_engine
from app.vision.measurement.service import compute_defect_measurements
from app.reports.generator import generate_pdf_report
from app.storage.local import storage

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"
)
logger = logging.getLogger("dhatu_rakshana.backfill")

def recalculate_all_evaluations(
    dry_run: bool = False,
    force: bool = False,
    target_id: Optional[int] = None,
    verbose: bool = False
) -> Dict[str, Any]:
    """Executes the historical evaluation backfill process."""
    logger.info("=" * 70)
    logger.info(f"STARTING ISO-ALIGNED HISTORICAL EVALUATION RECALCULATION")
    logger.info(f"Evaluation Engine Version: {EVALUATION_ENGINE_VERSION}")
    logger.info(f"Mode: {'DRY RUN (No database modifications)' if dry_run else 'LIVE MIGRATION'}")
    logger.info(f"Target: {'Single Inspection #' + str(target_id) if target_id else 'All Database Inspections'}")
    logger.info("=" * 70)

    stats = {
        "discovered": 0,
        "recalculated": 0,
        "already_current": 0,
        "failed": 0,
        "skipped": 0,
        "dry_run_affected": 0,
        "details": []
    }

    with Session(engine) as session:
        query = select(Inspection).order_by(Inspection.id.asc())
        if target_id is not None:
            query = query.where(Inspection.id == target_id)

        inspections = session.exec(query).all()
        stats["discovered"] = len(inspections)

        logger.info(f"Discovered {len(inspections)} inspection records for evaluation.")

        for insp in inspections:
            insp_id = insp.id
            logger.info(f"\n--- Evaluating Inspection #{insp_id} (Zone {insp.zone_id}) ---")

            # Check if already recalculated with current version and not forcing
            has_current_measurements = session.exec(
                select(InspectionMeasurement).where(
                    InspectionMeasurement.inspection_id == insp_id,
                    InspectionMeasurement.evaluation_engine_version == EVALUATION_ENGINE_VERSION
                )
            ).first() is not None

            if insp.evaluation_engine_version == EVALUATION_ENGINE_VERSION and has_current_measurements and not force:
                logger.info(f"Inspection #{insp_id} already evaluated with {EVALUATION_ENGINE_VERSION}. Skipping (use --force to recalculate).")
                stats["already_current"] += 1
                stats["details"].append({
                    "id": insp_id,
                    "status": "ALREADY_CURRENT",
                    "verdict": insp.overall_verdict,
                    "defect_count": len(insp.detections),
                    "notes": "Up to date"
                })
                continue

            try:
                # 1. Identify source images and artifacts
                images = session.exec(
                    select(InspectionImage).where(InspectionImage.inspection_id == insp_id)
                ).all()

                primary_img = next((img for img in images if img.is_primary), images[0]) if images else None
                if not primary_img:
                    # Check if inspection.image_path contains keys
                    keys = [k.strip() for k in insp.image_path.split(",") if k.strip()] if insp.image_path else []
                    if keys:
                        # Find or create InspectionImage record
                        primary_img = InspectionImage(
                            inspection_id=insp_id,
                            storage_key=keys[0],
                            original_filename=Path(keys[0]).name,
                            is_primary=True,
                            width=640,
                            height=640
                        )
                        if not dry_run:
                            session.add(primary_img)
                            session.commit()
                            session.refresh(primary_img)
                        images = [primary_img]

                if not primary_img:
                    raise FileNotFoundError(f"Inspection #{insp_id} has no associated source image records.")

                abs_img_path = storage.get_absolute_path(primary_img.storage_key)
                if not abs_img_path.exists():
                    raise FileNotFoundError(f"Primary source image file not found at: {abs_img_path}")

                # Load image for dimension verification
                with Image.open(str(abs_img_path)) as pil_img:
                    img_w, img_h = pil_img.size

                primary_img.width = img_w
                primary_img.height = img_h

                # Topology verification
                topo_rec = session.exec(
                    select(TopologyFile).where(TopologyFile.inspection_id == insp_id)
                ).first()

                # 2. Existing detections & measurements
                existing_detections = session.exec(
                    select(Detection).where(Detection.inspection_id == insp_id)
                ).all()

                detections_for_eval = []
                for d in existing_detections:
                    meas = d.measurement.to_dict() if d.measurement else {}
                    # If measurement missing or zero, recalculate
                    if not meas or meas.get("pixel_area", 0) == 0:
                        meas = compute_defect_measurements(
                            bbox=d.bbox,
                            image_width=img_w,
                            image_height=img_h
                        )
                        if not dry_run:
                            if d.measurement:
                                d.measurement.pixel_area = meas["pixel_area"]
                                d.measurement.area_pct = meas["area_pct"]
                                session.add(d.measurement)
                            else:
                                new_meas = DefectMeasurement(
                                    detection_id=d.id,
                                    bbox_width=meas["bbox_width"],
                                    bbox_height=meas["bbox_height"],
                                    aspect_ratio=meas["aspect_ratio"],
                                    pixel_area=meas["pixel_area"],
                                    area_pct=meas["area_pct"],
                                    centroid_x=meas["centroid_x"],
                                    centroid_y=meas["centroid_y"]
                                )
                                session.add(new_meas)

                    detections_for_eval.append({
                        "id": d.id,
                        "class": d.class_name,
                        "subtype": d.subtype,
                        "confidence": d.confidence,
                        "area_pct": d.area_pct,
                        "measurement": meas,
                        "bbox": d.bbox
                    })

                # 3. Execute ISO evaluation engine
                iso_result = iso_evaluation_engine.evaluate_inspection(
                    inspection_id=insp_id,
                    image_records=images,
                    detections=detections_for_eval,
                    topology_record=topo_rec
                )

                new_verdict = iso_result["overall_verdict"]
                new_measurements = iso_result["measurements"]
                eval_summary = iso_result["evaluation_summary"]

                logger.info(
                    f"Recalculation outcome: Verdict={new_verdict} (Previous={insp.overall_verdict}), "
                    f"Anomalies={len(existing_detections)}, Measurements={len(new_measurements)}"
                )

                if dry_run:
                    stats["dry_run_affected"] += 1
                    stats["details"].append({
                        "id": insp_id,
                        "status": "DRY_RUN_READY",
                        "previous_verdict": insp.overall_verdict,
                        "new_verdict": new_verdict,
                        "defect_count": len(existing_detections),
                        "measurements_count": len(new_measurements)
                    })
                    continue

                # 4. Transactional persistence
                # A. Archive previous evaluation snapshot if not already archived
                existing_archive = session.exec(
                    select(EvaluationHistory).where(
                        EvaluationHistory.inspection_id == insp_id,
                        EvaluationHistory.evaluation_engine_version == (insp.evaluation_engine_version or "1.0.0")
                    )
                ).first()

                if not existing_archive:
                    snapshot_data = json.dumps({
                        "previous_verdict": insp.overall_verdict,
                        "previous_timestamp": format_ist_iso(insp.timestamp),
                        "defect_count": len(existing_detections),
                        "detections": [d.to_dict() for d in existing_detections],
                        "graded_records": [g.to_dict() for d in existing_detections for g in d.graded_records]
                    })
                    history_entry = EvaluationHistory(
                        inspection_id=insp_id,
                        evaluation_engine_version=insp.evaluation_engine_version or "1.0.0-legacy",
                        overall_verdict=insp.overall_verdict,
                        defect_count=len(existing_detections),
                        snapshot_data=snapshot_data,
                        evaluated_at=insp.timestamp,
                        archived_at=get_ist_now()
                    )
                    session.add(history_entry)

                # B. Remove old measurements for this inspection to guarantee idempotence
                old_measurements = session.exec(
                    select(InspectionMeasurement).where(InspectionMeasurement.inspection_id == insp_id)
                ).all()
                for old_m in old_measurements:
                    session.delete(old_m)

                # C. Insert new structured measurements
                for m_data in new_measurements:
                    meas_obj = InspectionMeasurement(**m_data)
                    session.add(meas_obj)

                # D. Update Inspection record
                now_ist = get_ist_now()
                insp.overall_verdict = new_verdict
                insp.evaluation_engine_version = EVALUATION_ENGINE_VERSION
                insp.recalculated_at = now_ist
                session.add(insp)

                # E. Update defect graded records
                for d in existing_detections:
                    grade_res = standards_engine.grade_detection(
                        subtype=d.subtype,
                        area_pct=d.area_pct,
                        confidence=d.confidence
                    )
                    d.severity = grade_res["severity"]
                    session.add(d)

                    existing_grade = session.exec(
                        select(GradedDefectRecord).where(GradedDefectRecord.detection_id == d.id)
                    ).first()
                    if existing_grade:
                        existing_grade.standard_reference = grade_res["standard_reference"]
                        existing_grade.rule_version = grade_res["rule_version"]
                        existing_grade.severity = grade_res["severity"]
                        existing_grade.pass_fail = grade_res["pass_fail"]
                        existing_grade.notes = grade_res.get("notes")
                        session.add(existing_grade)
                    else:
                        new_grade = GradedDefectRecord(
                            detection_id=d.id,
                            standard_reference=grade_res["standard_reference"],
                            rule_version=grade_res["rule_version"],
                            severity=grade_res["severity"],
                            pass_fail=grade_res["pass_fail"],
                            notes=grade_res.get("notes")
                        )
                        session.add(new_grade)

                # F. Regenerate PDF report
                report_context = {
                    "id": insp.id,
                    "zone_id": insp.zone_id,
                    "zone": insp.zone.to_dict() if insp.zone else {"name": f"Zone {insp.zone_id}"},
                    "overall_verdict": insp.overall_verdict,
                    "timestamp": format_ist_iso(insp.timestamp),
                    "image_url": storage.get_public_url(primary_img.storage_key),
                    "mesh_url": storage.get_public_url(insp.mesh_path) if insp.mesh_path else None,
                    "detections": [d.to_dict() for d in existing_detections],
                    "measurements": new_measurements,
                    "evaluation_summary": eval_summary,
                    "evaluation_engine_version": EVALUATION_ENGINE_VERSION
                }

                pdf_bytes = generate_pdf_report(report_context)
                report_key, _, report_sha256 = storage.save_bytes(
                    pdf_bytes,
                    filename=f"dhatu-rakshana-report-{insp.id}.pdf",
                    subfolder="reports"
                )

                existing_report = session.exec(
                    select(InspectionReport).where(InspectionReport.inspection_id == insp_id)
                ).first()
                if existing_report:
                    existing_report.storage_key = report_key
                    existing_report.file_size_bytes = len(pdf_bytes)
                    existing_report.checksum_sha256 = report_sha256
                    existing_report.generated_at = now_ist
                    session.add(existing_report)
                else:
                    new_report = InspectionReport(
                        inspection_id=insp_id,
                        report_title=f"Coating Defect Audit Report #{insp_id}",
                        storage_key=report_key,
                        file_size_bytes=len(pdf_bytes),
                        checksum_sha256=report_sha256,
                        generated_at=now_ist
                    )
                    session.add(new_report)

                session.commit()
                logger.info(f"✓ Inspection #{insp_id} successfully recalculated and persisted.")
                stats["recalculated"] += 1
                stats["details"].append({
                    "id": insp_id,
                    "status": "SUCCESS",
                    "previous_verdict": insp.overall_verdict,
                    "new_verdict": new_verdict,
                    "defect_count": len(existing_detections),
                    "measurements_count": len(new_measurements)
                })

            except Exception as exc:
                session.rollback()
                logger.error(f"✗ Failed to recalculate inspection #{insp_id}: {exc}", exc_info=verbose)
                stats["failed"] += 1
                stats["details"].append({
                    "id": insp_id,
                    "status": "FAILED",
                    "error": str(exc)
                })

    # Summary Output
    logger.info("\n" + "=" * 70)
    logger.info("HISTORICAL EVALUATION RECALCULATION SUMMARY")
    logger.info("=" * 70)
    logger.info(f"Total Inspections Discovered:  {stats['discovered']}")
    if dry_run:
        logger.info(f"Inspections Ready to Update:   {stats['dry_run_affected']}")
    else:
        logger.info(f"Successfully Recalculated:     {stats['recalculated']}")
        logger.info(f"Already Up to Date:            {stats['already_current']}")
        logger.info(f"Failed Recalculations:         {stats['failed']}")
    logger.info("=" * 70)

    return stats

def main():
    parser = argparse.ArgumentParser(description="Recalculate historical marine coating inspections with ISO evaluation engine.")
    parser.add_argument("--dry-run", action="store_true", help="Perform pre-flight verification without modifying database.")
    parser.add_argument("--force", action="store_true", help="Recalculate even if already on current engine version.")
    parser.add_argument("--inspection-id", type=int, default=None, help="Target a specific inspection ID.")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose error traces.")

    args = parser.parse_args()
    recalculate_all_evaluations(
        dry_run=args.dry_run,
        force=args.force,
        target_id=args.inspection_id,
        verbose=args.verbose
    )

if __name__ == "__main__":
    main()
