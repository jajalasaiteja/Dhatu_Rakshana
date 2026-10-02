"""Performance benchmarking script measuring processing times across pipeline stages."""

import sys
import time
from pathlib import Path
import numpy as np

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.ml.registry import model_registry
from app.ml.preprocess import load_and_preprocess_image
from app.vision.measurement.service import compute_defect_measurements
from app.vision.reconstruction.service import reconstruct_surface_mesh
from app.standards.engine import standards_engine
from app.reports.generator import generate_pdf_report

def run_benchmarks(sample_image_path: Path):
    print("=" * 60)
    print("DHATU RAKSHANA PIPELINE BENCHMARK")
    print("=" * 60)

    # 1. Preprocessing
    t0 = time.perf_counter()
    img_np, (w, h) = load_and_preprocess_image(sample_image_path)
    t_prep = (time.perf_counter() - t0) * 1000
    print(f"1. Image Preprocessing ({w}x{h}): {t_prep:.2f} ms")

    # 2. ML / CV Inference
    model = model_registry.get_model()
    t0 = time.perf_counter()
    res = model.predict(img_np)
    t_infer = (time.perf_counter() - t0) * 1000
    print(f"2. ML/CV Inference ({res.model_name}, {len(res.detections)} defects): {t_infer:.2f} ms")

    # 3. Geometric Measurements
    t0 = time.perf_counter()
    for d in res.detections:
        compute_defect_measurements(d.bbox, w, h, img_np)
    t_meas = (time.perf_counter() - t0) * 1000
    print(f"3. Defect Measurements ({len(res.detections)} candidates): {t_meas:.2f} ms")

    # 4. Open3D Micro-Topography
    import tempfile
    t0 = time.perf_counter()
    with tempfile.TemporaryDirectory() as td:
        recon = reconstruct_surface_mesh([sample_image_path], Path(td), "bench_mesh")
    t_open3d = (time.perf_counter() - t0) * 1000
    print(f"4. Open3D Surface Reconstruction ({recon['vertex_count']} verts, {recon['triangle_count']} tris): {t_open3d:.2f} ms")

    # 5. Standards Grading
    t0 = time.perf_counter()
    graded = [standards_engine.grade_detection(d.subtype, d.area_pct, d.confidence) for d in res.detections]
    verdict = standards_engine.determine_overall_verdict(graded)
    t_grade = (time.perf_counter() - t0) * 1000
    print(f"5. Standards Grading (Verdict: {verdict}): {t_grade:.2f} ms")

    # 6. ReportLab PDF Generation
    t0 = time.perf_counter()
    report_data = {
        "id": 1,
        "zone": {"name": "Hull section 4", "asset_description": "Waterline anti-fouling primer"},
        "overall_verdict": verdict,
        "timestamp": "2026-10-02T16:55:00Z",
        "image_url": "/files/images/bench.png",
        "mesh_url": "/files/meshes/bench.ply",
        "detections": [d.to_dict() for d in res.detections],
        "graded_results": graded
    }
    pdf_bytes = generate_pdf_report(report_data)
    t_pdf = (time.perf_counter() - t0) * 1000
    print(f"6. ReportLab PDF Generation ({len(pdf_bytes)} bytes): {t_pdf:.2f} ms")

    total_ms = t_prep + t_infer + t_meas + t_open3d + t_grade + t_pdf
    print("-" * 60)
    print(f"TOTAL PIPELINE EXECUTION TIME: {total_ms:.2f} ms ({total_ms/1000:.2f} s)")
    print("=" * 60)

if __name__ == "__main__":
    if len(sys.argv) > 1 and Path(sys.argv[1]).exists():
        test_img = Path(sys.argv[1])
    else:
        candidate = backend_root / "data" / "datasets" / "synthetic_defects" / "images" / "marine_scan_002_scratch.png"
        if candidate.exists():
            test_img = candidate
        else:
            from PIL import Image
            test_img = Path("/tmp/bench_scan.png")
            Image.fromarray(np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)).save(test_img)
    run_benchmarks(test_img)
