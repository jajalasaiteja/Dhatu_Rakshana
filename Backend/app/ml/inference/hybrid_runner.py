"""Hybrid Defect Detection Runner combining Deep Learning Candidates with OpenCV Refinement."""

from pathlib import Path
from typing import List, Union, Optional
import numpy as np
import time
import cv2
import logging

from app.ml.base import BaseInferenceEngine, DefectCandidate, InferenceResult
from app.ml.inference.classical_cv_runner import ClassicalCVRunner
from app.ml.inference.ultralytics_runner import UltralyticsRunner
from app.ml.postprocess import clamp_bbox, apply_nms
from app.ml.preprocess import load_and_preprocess_image

logger = logging.getLogger("dhatu_rakshana.hybrid_runner")

class HybridDefectRunner(BaseInferenceEngine):
    def __init__(
        self,
        name: str = "marine_hybrid_v1",
        version: str = "1.5.0",
        weights_path: Optional[Union[str, Path]] = None,
        device: str = "auto"
    ):
        super().__init__(name=name, version=version, device=device)
        self.weights_path = Path(weights_path) if weights_path else None
        self.yolo_runner = UltralyticsRunner(
            name=f"{name}_yolo",
            version=version,
            weights_path=self.weights_path,
            device=device
        )
        self.cv_runner = ClassicalCVRunner(
            name=f"{name}_cv",
            version=version
        )
        self.has_deep_learning_model = False

    def load_model(self) -> bool:
        self.cv_runner.load_model()
        if self.weights_path and self.weights_path.exists():
            success = self.yolo_runner.load_model()
            self.has_deep_learning_model = success
        else:
            self.has_deep_learning_model = False
            logger.info("Hybrid Runner operating in Classical Computer Vision + Morphological mode (weights not yet trained).")
        self.is_loaded = True
        return True

    def unload_model(self):
        self.yolo_runner.unload_model()
        self.cv_runner.unload_model()
        self.is_loaded = False

    def _refine_with_opencv(
        self,
        candidates: List[DefectCandidate],
        img_rgb: np.ndarray
    ) -> List[DefectCandidate]:
        """Refines bounding box boundaries and extracts morphological sub-pixel contours."""
        h, w = img_rgb.shape[:2]
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        total_pixels = float(w * h)
        refined: List[DefectCandidate] = []

        for c in candidates:
            box = c.bbox
            x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
            roi_w = max(1, x2 - x1)
            roi_h = max(1, y2 - y1)
            roi = gray[y1:y2, x1:x2]

            if roi.size == 0:
                refined.append(c)
                continue

            # Local Otsu threshold inside ROI to isolate true defect boundary
            _, thresh = cv2.threshold(roi, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            if contours:
                largest = max(contours, key=cv2.contourArea)
                c_area = cv2.contourArea(largest)
                rx, ry, rw, rh = cv2.boundingRect(largest)

                # Adjusted coordinates in original frame
                refined_box = clamp_bbox([x1 + rx, y1 + ry, x1 + rx + rw, y1 + ry + rh], w, h)
                actual_area = max(c_area, 1.0)
                area_pct = round((actual_area / total_pixels) * 100.0, 4)

                c.bbox = refined_box
                c.area_pct = area_pct
                c.metadata["refined_by"] = "opencv_otsu"
                c.metadata["roi_contour_area"] = c_area

            refined.append(c)

        return refined

    def predict(
        self,
        image_input: Union[str, Path, np.ndarray],
        confidence_threshold: float = 0.45
    ) -> InferenceResult:
        start_time = time.perf_counter()

        if isinstance(image_input, np.ndarray):
            img_rgb = image_input
            orig_h, orig_w = img_rgb.shape[:2]
        else:
            img_rgb, (orig_w, orig_h) = load_and_preprocess_image(image_input)

        # 1. Primary candidate detection
        if self.has_deep_learning_model and self.yolo_runner.is_loaded:
            raw_result = self.yolo_runner.predict(img_rgb, confidence_threshold=confidence_threshold)
            candidates = raw_result.detections
            framework = "yolo_v8+opencv_refinement"
        else:
            raw_result = self.cv_runner.predict(img_rgb, confidence_threshold=confidence_threshold)
            candidates = raw_result.detections
            framework = "opencv_morphology_refined"

        # 2. Stage B: OpenCV boundary and contour refinement
        refined_candidates = self._refine_with_opencv(candidates, img_rgb)

        # 3. Postprocess NMS
        final_detections = apply_nms(refined_candidates, iou_threshold=0.45, max_detections=30)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return InferenceResult(
            detections=final_detections,
            model_name=self.name,
            model_version=self.version,
            framework=framework,
            device=self.device,
            inference_time_ms=round(elapsed_ms, 2),
            image_width=orig_w,
            image_height=orig_h
        )
