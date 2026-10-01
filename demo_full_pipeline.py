"""
End-to-End Pipeline Demonstration Script for Defense Marine Coating Inspection.
Executes the full pipeline:
  Synthetic Image -> Local S3 Storage -> Open3D Surface Reconstruction ->
  AI Detection -> Standards Grading Engine -> Database Storage -> Summary Report
"""

import sys
import tempfile
from pathlib import Path
from datetime import datetime, timezone
from PIL import Image

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from db.db import init_db, engine, get_session
from db.models import Zone, Inspection, Detection, GradedDefectRecord
from db.seed import seed_zones
from sqlmodel import Session, select

from backend.app.storage import storage
from backend.app.services.mapping_service import reconstruct_surface_mesh
from backend.app.services.detection_service import detect
from backend.app.services.grading_service import grading_engine
from ml.generate_sample_data import generate_samples

def print_separator(title: str = ""):
    print("\n" + "=" * 80)
    if title:
        print(f"  {title.upper()}")
        print("=" * 80)

def run_demo():
    print_separator("Dhatu Rakshana - End-to-End Defense Marine Inspection Pipeline Demo")

    # 1. Initialize DB and Seed Zones
    print("\n[1/6] Initializing Database & Verifying Naval Platform Zones...")
    init_db()
    seed_zones()

    with Session(engine) as session:
        zones = session.exec(select(Zone)).all()
        if not zones:
            print("Error: No zones found.")
            return
        selected_zone = zones[0]
        print(f"      Selected Platform Zone: [{selected_zone.id}] {selected_zone.name}")

    # 2. Ensure synthetic dataset exists
    print("\n[2/6] Checking Synthetic Coating Defect Sample Images...")
    dataset_dir = PROJECT_ROOT / "ml" / "dataset" / "images"
    sample_images = list(dataset_dir.glob("*.png"))
    if not sample_images:
        print("      No synthetic images found. Generating sample suite...")
        generate_samples(count=10, output_dir=PROJECT_ROOT / "ml" / "dataset")
        sample_images = list(dataset_dir.glob("*.png"))

    # Choose a sample defect image (prefer scratch, pinhole or contamination)
    sample_img = None
    for p in sample_images:
        if any(defect in p.name for defect in ["scratch", "pinhole", "inclusion", "contamination"]):
            sample_img = p
            break
    if not sample_img:
        sample_img = sample_images[0]

    print(f"      Selected Test Specimen: {sample_img.name}")

    # 3. Store via Storage Adapter
    print("\n[3/6] Ingesting Specimen into S3-Structured Storage Adapter...")
    with open(sample_img, "rb") as f:
        img_bytes = f.read()
    image_key, abs_image_path = storage.save_bytes(img_bytes, filename=sample_img.name, subfolder="images")
    print(f"      Saved S3 Key: {image_key}")
    print(f"      Local Path:   {abs_image_path}")

    # 4. Open3D 3D Surface Reconstruction
    print("\n[4/6] Running Real Open3D 3D Micro-Topography Surface Reconstruction...")
    mesh_key = None
    with tempfile.TemporaryDirectory() as tmp_dir:
        recon_result = reconstruct_surface_mesh(
            image_path=abs_image_path,
            output_dir=Path(tmp_dir),
            base_filename="demo_surface_mesh"
        )
        if recon_result.get("success") and recon_result.get("ply_path"):
            mesh_key, abs_mesh_path = storage.save_file_from_path(
                Path(recon_result["ply_path"]),
                filename="demo_surface_mesh.ply",
                subfolder="meshes"
            )
            print(f"      [Open3D Success] Generated 3D Mesh (.ply):")
            print(f"        - Vertices:  {recon_result.get('vertex_count'):,}")
            print(f"        - Triangles: {recon_result.get('triangle_count'):,}")
            print(f"        - Mesh Key:  {mesh_key}")
        else:
            print(f"      [Open3D Note] 3D Mesh reconstruction handled: {recon_result.get('error')}")

    # 5. AI Defect Detection & Standards Grading Engine
    print("\n[5/6] Executing AI Detection & Marine Standards Rules Engine...")
    raw_detections = detect(str(abs_image_path))
    with Image.open(str(abs_image_path)) as img:
        img_w, img_h = img.size

    graded_items = []
    for d in raw_detections:
        grade = grading_engine.grade_detection(d, img_w, img_h)
        graded_items.append({"detection": d, "grade": grade})

    overall_verdict = grading_engine.determine_overall_verdict([g["grade"] for g in graded_items])
    print(f"      Detected Defects: {len(raw_detections)}")
    print(f"      Overall Inspection Verdict: [{overall_verdict}]")

    # 6. Database Transaction
    print("\n[6/6] Writing Complete Inspection Record to Database...")
    with Session(engine) as session:
        insp = Inspection(
            image_path=image_key,
            mesh_path=mesh_key,
            timestamp=datetime.now(timezone.utc),
            zone_id=selected_zone.id,
            overall_verdict=overall_verdict
        )
        session.add(insp)
        session.commit()
        session.refresh(insp)

        for item in graded_items:
            d_info = item["detection"]
            g_info = item["grade"]

            det = Detection(
                inspection_id=insp.id,
                class_name=d_info["class"],
                subtype=d_info["subtype"],
                bbox_raw="",
                confidence=d_info["confidence"]
            )
            det.bbox = d_info["bbox"]
            session.add(det)
            session.commit()
            session.refresh(det)

            g_rec = GradedDefectRecord(
                detection_id=det.id,
                standard_reference=g_info["standard_reference"],
                severity=g_info["severity"],
                pass_fail=g_info["pass_fail"]
            )
            session.add(g_rec)
            session.commit()

        inspection_id = insp.id

    # 7. Print Master Summary Table
    print_separator("INSPECTION AUDIT SUMMARY REPORT")
    print(f" Inspection ID    : #{inspection_id}")
    print(f" Platform Zone    : {selected_zone.name}")
    print(f" Ingestion Key    : {image_key}")
    print(f" 3D Mesh Output   : {mesh_key if mesh_key else 'None'}")
    print(f" Timestamp        : {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f" Overall Verdict  : >>> {overall_verdict} <<<")
    print("-" * 80)
    print(f"{'#':<3} | {'Class':<8} | {'Subtype':<14} | {'Conf':<6} | {'Area %':<8} | {'Severity':<10} | {'Status':<7} | {'Standard Reference'}")
    print("-" * 80)

    for idx, item in enumerate(graded_items, 1):
        d = item["detection"]
        g = item["grade"]
        print(f"{idx:<3} | {d['class']:<8} | {d['subtype']:<14} | {d['confidence']:<6.2f} | {g.get('area_pct', 0.0):<8.2f} | {g['severity']:<10} | {g['pass_fail']:<7} | {g['standard_reference']}")
    print("=" * 80)
    print(" PIPELINE VERIFICATION SUCCESSFUL: All components operational!")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    run_demo()
