# core/inspector.py
import torch
import torchvision
from torchvision import transforms as TF
from ultralytics import YOLO
from PIL import Image, ImageDraw
import numpy as np
from pathlib import Path

COLOR_MAP = {
    "pinhole": (0, 229, 255),       # Cyan
    "scratch": (255, 23, 68),       # Red
    "inclusion": (255, 140, 0),     # Orange
    "contamination": (255, 214, 0), # Gold
}

MODES = {
    "balanced": {"conf": 0.18, "clean_thr": 0.65},  # 86.7% Recall | Low false alarms
    "safety":   {"conf": 0.08, "clean_thr": 0.65},  # 93.3% Recall | Catches micro-pinholes
    "precision":{"conf": 0.35, "clean_thr": 0.65},  # 90.6% Clean pass rate
}

class CoatingInspector:
    def __init__(self, yolo_path="models/yolo_detector.pt", resnet_path="models/resnet_classifier.pt", device=None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Loading Coating Defect Pipeline on {self.device.upper()}...")
        
        # 1. Load YOLO Detector
        self.yolo = YOLO(str(yolo_path))
        
        # 2. Load ResNet Classifier
        ck = torch.load(str(resnet_path), map_location=self.device)
        self.classes = ck["classes"]
        arch = ck.get("arch", "resnet18")
        imgsz = ck.get("imgsz", 224)
        
        ctor = getattr(torchvision.models, arch)
        self.resnet = ctor(weights=None)
        self.resnet.fc = torch.nn.Linear(self.resnet.fc.in_features, len(self.classes))
        self.resnet.load_state_dict(ck["state_dict"])
        self.resnet.to(self.device).eval()
        
        self.tf = TF.Compose([
            TF.Resize((imgsz, imgsz)),
            TF.ToTensor(),
            TF.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        print("✅ Models loaded successfully!")

    def _crop(self, im, box, min_side=32):
        W, H = im.size
        x0, y0, x1, y1 = box
        bw, bh = max(x1 - x0, 1), max(y1 - y0, 1)
        side = min(max(max(bw, bh) * 1.8, min_side), min(W, H))
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        left = min(max(cx - side / 2, 0), W - side)
        top = min(max(cy - side / 2, 0), H - side)
        return im.crop((int(left), int(top), int(left + side), int(top + side)))

    def inspect(self, image_path, mode="balanced"):
        cfg = MODES.get(mode, MODES["balanced"])
        conf_thr = cfg["conf"]
        clean_thr = cfg["clean_thr"]
        
        orig_im = Image.open(image_path).convert("RGB")
        W, H = orig_im.size
        
        # 1. Stage 1: Detection
        # Large images (>1200px) use high-res slicing or direct 1280px predict
        imgsz = 1280 if max(W, H) > 1200 else max(640, max(W, H))
        preds = self.yolo.predict(orig_im, conf=conf_thr, imgsz=imgsz, verbose=False, device=self.device)[0]
        
        if len(preds.boxes) == 0:
            return {"defects": [], "is_clean": True, "image": orig_im}
        
        boxes = preds.boxes.xyxy.cpu().numpy()
        yolo_confs = preds.boxes.conf.cpu().numpy()
        
        # 2. Stage 2: Subtype Classification & Soft Rejection
        crops = [self._crop(orig_im, b) for b in boxes]
        batch = torch.stack([self.tf(c) for c in crops]).to(self.device)
        with torch.no_grad():
            logits = self.resnet(batch)
            probs = torch.softmax(logits, dim=1).cpu().numpy()
            
        defects = []
        for b, y_conf, p in zip(boxes, yolo_confs, probs):
            p_dict = {cls_name: float(pr) for cls_name, pr in zip(self.classes, p)}
            p_clean = p_dict.get("no_defect", 0.0)
            
            # Rejection filter
            if p_clean >= clean_thr:
                continue
                
            defect_subtypes = {k: v for k, v in p_dict.items() if k != "no_defect"}
            best_sub = max(defect_subtypes, key=defect_subtypes.get)
            
            defects.append({
                "box": [round(x, 1) for x in b],
                "subtype": best_sub,
                "confidence": round(defect_subtypes[best_sub], 2),
                "yolo_conf": round(float(y_conf), 2)
            })
            
        return {
            "defects": defects,
            "is_clean": len(defects) == 0,
            "image": orig_im
        }