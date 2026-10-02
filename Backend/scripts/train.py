"""Training script for Ultralytics YOLOv8 marine coating defect detection models."""

import argparse
import sys
from pathlib import Path
import yaml
import torch

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

def train(data_yaml: Path, epochs: int = 50, batch_size: int = 16, imgsz: int = 640, device: str = "auto"):
    from ultralytics import YOLO

    resolved_device = 0 if (device == "cuda" or (device == "auto" and torch.cuda.is_available())) else "cpu"
    print(f"Initializing YOLOv8 training on device: {resolved_device}")

    # Load base pretrained YOLOv8 nano model
    model = YOLO("yolov8n.pt")

    results = model.train(
        data=str(data_yaml),
        epochs=epochs,
        batch=batch_size,
        imgsz=imgsz,
        device=resolved_device,
        project=str(backend_root / "models" / "runs"),
        name="marine_coating_train"
    )

    best_weights = Path(results.save_dir) / "weights" / "best.pt"
    target_weights = backend_root / "models" / "detection" / "marine_coating_yolov8.pt"
    target_weights.parent.mkdir(parents=True, exist_ok=True)

    if best_weights.exists():
        import shutil
        shutil.copy2(str(best_weights), str(target_weights))
        print(f"Exported best model weights to: {target_weights}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Marine Coating YOLOv8 Model")
    default_data = "data/datasets/synthetic_defects/data.yaml" if (backend_root / "data/datasets/synthetic_defects/data.yaml").exists() else "data.yaml"
    parser.add_argument("--data", type=str, default=default_data, help="Path to data.yaml")
    parser.add_argument("--epochs", type=int, default=10, help="Epoch count")
    parser.add_argument("--batch", type=int, default=8, help="Batch size")
    parser.add_argument("--device", type=str, default="auto", help="cuda, cpu, or auto")
    args = parser.parse_args()

    train(Path(args.data), epochs=args.epochs, batch_size=args.batch, device=args.device)
