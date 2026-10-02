"""Ultralytics YOLO inference runner for trained deep-learning marine defect models."""

from pathlib import Path
from typing import List, Union, Optional, Dict
import numpy as np
import time
import torch
import logging

from app.ml.base import BaseInferenceEngine, DefectCandidate, InferenceResult
from app.ml.postprocess import clamp_bbox
from app.ml.preprocess import load_and_preprocess_image

logger = logging.getLogger("dhatu_rakshana.yolo")

DEFECT_CLASS_MAP: Dict[int, str] = {
    0: "corrosion",
    1: "blister",
    2: "scratch",
    3: "pinhole",
    4: "inclusion",
    5: "contamination",
    6: "dust_particle"
}

class UltralyticsRunner(BaseInferenceEngine):
    def __init__(
        self,
        name: str = "marine_yolo_v8",
        version: str = "1.0.0",
        weights_path: Optional[Union[str, Path]] = None,
        device: str = "auto"
    ):
        resolved_device = "cuda" if (device == "cuda" or (device == "auto" and torch.cuda.is_available())) else "cpu"
        super().__init__(name=name, version=version, device=resolved_device)
        self.weights_path = Path(weights_path) if weights_path else None
        self.model = None

    def load_model(self) -> bool:
        if self.is_loaded and self.model is not None:
            return True

        if not self.weights_path or not self.weights_path.exists():
            logger.info(f"Ultralytics weights not found at {self.weights_path}. Model remains uninitialized.")
            self.is_loaded = False
            return False

        try:
            from ultralytics import YOLO
            logger.info(f"Loading Ultralytics YOLO model from {self.weights_path} onto {self.device}...")
            self.model = YOLO(str(self.weights_path))
            self.is_loaded = True
            logger.info("Ultralytics YOLO model loaded successfully.")
            return True
        except Exception as exc:
            logger.error(f"Failed to load Ultralytics YOLO model: {exc}")
            self.is_loaded = False
            return False

    def unload_model(self):
        if self.model is not None:
            del self.model
            self.model = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        self.is_loaded = False

    def predict(
        self,
        image_input: Union[str, Path, np.ndarray],
        confidence_threshold: float = 0.45
    ) -> InferenceResult:
        if not self.is_loaded or self.model is None:
            raise RuntimeError(
                f"Ultralytics model '{self.name}' ({self.version}) weights not available at {self.weights_path}. "
                "Train or configure valid weights path before requesting direct YOLO inference."
            )

        start_time = time.perf_counter()

        if isinstance(image_input, np.ndarray):
            img_rgb = image_input
            orig_h, orig_w = img_rgb.shape[:2]
        else:
            img_rgb, (orig_w, orig_h) = load_and_preprocess_image(image_input)

        results = self.model.predict(
            source=img_rgb,
            conf=confidence_threshold,
            device=self.device,
            verbose=False
        )

        candidates: List[DefectCandidate] = []
        total_pixels = float(orig_w * orig_h)

        if results and len(results) > 0:
            result = results[0]
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    xyxy = box.xyxy[0].tolist()
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())

                    subtype = DEFECT_CLASS_MAP.get(cls_id, "defect")
                    clamped = clamp_bbox(xyxy, orig_w, orig_h)
                    w = clamped[2] - clamped[0]
                    h = clamped[3] - clamped[1]
                    area_pct = round(((w * h) / total_pixels) * 100.0, 4)

                    candidates.append(
                        DefectCandidate(
                            class_name="defect",
                            subtype=subtype,
                            bbox=clamped,
                            confidence=conf,
                            area_pct=area_pct,
                            metadata={"class_id": cls_id, "framework": "ultralytics_yolo"}
                        )
                    )

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return InferenceResult(
            detections=candidates,
            model_name=self.name,
            model_version=self.version,
            framework="ultralytics",
            device=self.device,
            inference_time_ms=round(elapsed_ms, 2),
            image_width=orig_w,
            image_height=orig_h
        )
