import tempfile
from pathlib import Path
from datetime import datetime, timezone
from PIL import Image
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlmodel import Session, select
from typing import Optional

from db.db import get_session
from db.models import Zone, Inspection, Detection, GradedDefectRecord
from backend.app.storage import storage
from backend.app.services.mapping_service import reconstruct_surface_mesh
from backend.app.services.detection_service import detect
from backend.app.services.grading_service import grading_engine

router = APIRouter(prefix="/inspections", tags=["inspections"])

@router.post("")
async def create_inspection(
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    zone_id: int = Form(...),
    session: Session = Depends(get_session)
):
    upload_file = image or file
    if not upload_file:
        raise HTTPException(status_code=400, detail="Missing required image file.")

    # 1. Validate zone exists or fallback to first
    zone = session.get(Zone, zone_id)
    if not zone:
        # Fallback to create or retrieve zone
        first_zone = session.exec(select(Zone)).first()
        if first_zone:
            zone_id = first_zone.id
        else:
            new_zone = Zone(id=zone_id, name=f"Zone {zone_id}", asset_description="Naval defense platform strake")
            session.add(new_zone)
            session.commit()

    # 2. Read and save image
    contents = await upload_file.read()
    image_key, abs_image_path = storage.save_bytes(contents, upload_file.filename or "scan.png", subfolder="images")

    try:
        with Image.open(str(abs_image_path)) as img:
            img_w, img_h = img.size
    except Exception:
        img_w, img_h = 640, 640

    # 3. 3D Surface Reconstruction
    mesh_key = None
    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
            reconstruct_result = reconstruct_surface_mesh(
                image_path=abs_image_path,
                output_dir=Path(tmp_dir),
                base_filename="surface_mesh"
            )
            if reconstruct_result.get("success") and reconstruct_result.get("ply_path"):
                mesh_key, _ = storage.save_file_from_path(
                    Path(reconstruct_result["ply_path"]),
                    filename="surface_mesh.ply",
                    subfolder="meshes"
                )
    except Exception as e:
        print(f"[Warning] 3D mesh reconstruction skipped: {e}")

    # 4. Defect Detection
    raw_detections = detect(str(abs_image_path))

    # 5. Standards Grading
    graded_items = []
    for d in raw_detections:
        grade = grading_engine.grade_detection(d, img_w, img_h)
        graded_items.append({
            "detection": d,
            "grade": grade
        })

    overall_verdict = grading_engine.determine_overall_verdict([g["grade"] for g in graded_items])

    # 6. Database Transaction
    inspection = Inspection(
        image_path=image_key,
        mesh_path=mesh_key,
        timestamp=datetime.now(timezone.utc),
        zone_id=zone_id,
        overall_verdict=overall_verdict
    )
    session.add(inspection)
    session.commit()
    session.refresh(inspection)

    for item in graded_items:
        d_info = item["detection"]
        g_info = item["grade"]

        detection = Detection(
            inspection_id=inspection.id,
            class_name=d_info["class"],
            subtype=d_info["subtype"],
            bbox_raw="",
            confidence=d_info["confidence"]
        )
        detection.bbox = d_info["bbox"]
        session.add(detection)
        session.commit()
        session.refresh(detection)

        graded_rec = GradedDefectRecord(
            detection_id=detection.id,
            standard_reference=g_info["standard_reference"],
            severity=g_info["severity"],
            pass_fail=g_info["pass_fail"]
        )
        session.add(graded_rec)
        session.commit()

    return {
        "inspection_id": inspection.id,
        "overall_verdict": inspection.overall_verdict,
        "status": "COMPLETED"
    }

@router.get("")
def list_inspections(
    zone_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    query = select(Inspection).order_by(Inspection.timestamp.desc())
    if zone_id is not None:
        query = query.where(Inspection.zone_id == zone_id)

    inspections = session.exec(query).all()
    results = []
    for insp in inspections:
        zone_name = insp.zone.name if insp.zone else f"Zone {insp.zone_id}"
        img_url = storage.get_public_url(insp.image_path)
        results.append({
            "id": insp.id,
            "timestamp": insp.timestamp.isoformat(),
            "zone_id": insp.zone_id,
            "zone_name": zone_name,
            "overall_verdict": insp.overall_verdict,
            "image_url": img_url,
            "thumbnail_url": img_url,
            "mesh_url": storage.get_public_url(insp.mesh_path) if insp.mesh_path else None,
            "defect_count": len(insp.detections)
        })
    return results

@router.get("/{inspection_id}")
def get_inspection_detail(
    inspection_id: int,
    session: Session = Depends(get_session)
):
    insp = session.get(Inspection, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail=f"Inspection {inspection_id} not found.")

    detections_data = []
    graded_results = []
    for d in insp.detections:
        records_data = []
        for g in d.graded_records:
            record_dict = {
                "id": g.id,
                "detection_id": d.id,
                "standard_reference": g.standard_reference,
                "severity": g.severity,
                "pass_fail": g.pass_fail
            }
            records_data.append(record_dict)
            graded_results.append(record_dict)

        detections_data.append({
            "id": d.id,
            "class": d.class_name,
            "subtype": d.subtype,
            "bbox": d.bbox,
            "confidence": d.confidence,
            "graded_records": records_data
        })

    img_url = storage.get_public_url(insp.image_path)
    mesh_url = storage.get_public_url(insp.mesh_path) if insp.mesh_path else None

    return {
        "id": insp.id,
        "timestamp": insp.timestamp.isoformat(),
        "zone_id": insp.zone_id,
        "zone": insp.zone.to_dict() if insp.zone else {"name": f"Zone {insp.zone_id}"},
        "overall_verdict": insp.overall_verdict,
        "image_url": img_url,
        "thumbnail_url": img_url,
        "mesh_url": mesh_url,
        "detections": detections_data,
        "graded_results": graded_results
    }
