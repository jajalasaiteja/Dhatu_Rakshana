"""Model evaluation script calculating Precision, Recall, F1, and mAP metrics."""

import argparse
import sys
from pathlib import Path
import torch

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

def evaluate_model(weights_path: Path, data_yaml: Path):
    from ultralytics import YOLO

    if not weights_path.exists():
        print(f"Error: Model weights not found at {weights_path}")
        sys.exit(1)

    device = 0 if torch.cuda.is_available() else "cpu"
    print(f"Evaluating {weights_path.name} on {data_yaml} (device: {device})...")

    model = YOLO(str(weights_path))
    metrics = model.val(data=str(data_yaml), device=device)

    print("=" * 60)
    print("EVALUATION METRICS SUMMARY")
    print("=" * 60)
    print(f"mAP50:     {metrics.box.map50:.4f}")
    print(f"mAP50-95:  {metrics.box.map:.4f}")
    print(f"Precision: {metrics.box.mp:.4f}")
    print(f"Recall:    {metrics.box.mr:.4f}")
    print("=" * 60)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Marine Defect Model")
    parser.add_argument("--weights", type=str, default="models/detection/marine_coating_yolov8.pt")
    default_data = "data/datasets/synthetic_defects/data.yaml" if (backend_root / "data/datasets/synthetic_defects/data.yaml").exists() else "data.yaml"
    parser.add_argument("--data", type=str, default=default_data, help="Path to data.yaml")
    args = parser.parse_args()

    evaluate_model(backend_root / args.weights, Path(args.data))
