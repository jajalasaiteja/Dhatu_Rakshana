"""Classical Computer Vision Defect Detection Engine using OpenCV & Morphology."""

import cv2
import numpy as np
import time
from pathlib import Path
from typing import List, Union
import logging

from app.ml.base import BaseInferenceEngine, DefectCandidate, InferenceResult
from app.ml.postprocess import clamp_bbox, apply_nms
from app.ml.preprocess import load_and_preprocess_image

logger = logging.getLogger("dhatu_rakshana.classical_cv")

class ClassicalCVRunner(BaseInferenceEngine):
    def __init__(self, name: str = "marine_classical_cv", version: str = "1.2.0"):
        super().__init__(name=name, version=version, device="cpu")
        self.is_loaded = True

    def load_model(self) -> bool:
        self.is_loaded = True
        return True

    def unload_model(self):
        pass

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

        bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
        height, width = bgr.shape[:2]
        total_pixels = float(width * height)

        candidates: List[DefectCandidate] = []

        # -------------------------------------------------------------
        # 1. Rust / Active Corrosion Contamination (HSV Orange/Brown/Red)
        # -------------------------------------------------------------
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        mask_rust1 = cv2.inRange(hsv, np.array([5, 55, 45]), np.array([28, 255, 255]))
        mask_rust2 = cv2.inRange(hsv, np.array([170, 55, 45]), np.array([180, 255, 255]))
        mask_rust = cv2.bitwise_or(mask_rust1, mask_rust2)

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        mask_rust = cv2.morphologyEx(mask_rust, cv2.MORPH_CLOSE, kernel)
        rust_contours, _ = cv2.findContours(mask_rust, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in rust_contours:
            area = cv2.contourArea(c)
            # Minimum defect area threshold: 0.05% of frame
            if area > (total_pixels * 0.0005):
                x, y, bw, bh = cv2.boundingRect(c)
                pad = 4
                box = clamp_bbox([x - pad, y - pad, x + bw + pad, y + bh + pad], width, height)
                area_pct = round((area / total_pixels) * 100.0, 4)
                conf = min(0.98, max(confidence_threshold, 0.75 + (area / total_pixels) * 3.0))

                subtype = "corrosion" if area_pct > 0.5 else "contamination"
                candidates.append(
                    DefectCandidate(
                        class_name="defect",
                        subtype=subtype,
                        bbox=box,
                        confidence=conf,
                        area_pct=area_pct,
                        metadata={"contour_area": area, "method": "hsv_chromaticity"}
                    )
                )

        # -------------------------------------------------------------
        # 2. Blistering / White Slag Inclusions (Luminance Anomaly)
        # -------------------------------------------------------------
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        mask_white = cv2.inRange(gray, 192, 255)
        white_contours, _ = cv2.findContours(mask_white, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in white_contours:
            area = cv2.contourArea(c)
            if (total_pixels * 0.0003) < area < (total_pixels * 0.06):
                x, y, bw, bh = cv2.boundingRect(c)
                aspect = bw / float(bh) if bh > 0 else 0
                if 0.4 < aspect < 2.5:
                    box = clamp_bbox([x, y, x + bw, y + bh], width, height)
                    area_pct = round((area / total_pixels) * 100.0, 4)
                    subtype = "blister" if area_pct > 0.3 else "inclusion"
                    candidates.append(
                        DefectCandidate(
                            class_name="defect",
                            subtype=subtype,
                            bbox=box,
                            confidence=0.88,
                            area_pct=area_pct,
                            metadata={"contour_area": area, "method": "luminance_anomaly"}
                        )
                    )

        # -------------------------------------------------------------
        # 3. Scratches / Mechanical Gouges (Morphological Line Discontinuities)
        # -------------------------------------------------------------
        mask_dark = cv2.inRange(gray, 0, 50)
        line_kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 2))
        line_kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 9))
        filtered_h = cv2.morphologyEx(mask_dark, cv2.MORPH_OPEN, line_kernel_h)
        filtered_v = cv2.morphologyEx(mask_dark, cv2.MORPH_OPEN, line_kernel_v)
        filtered_scratch = cv2.bitwise_or(filtered_h, filtered_v)

        scratch_contours, _ = cv2.findContours(filtered_scratch, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in scratch_contours:
            area = cv2.contourArea(c)
            if area > (total_pixels * 0.0002):
                x, y, bw, bh = cv2.boundingRect(c)
                # Ignore outermost border artifacts
                if x > 10 and (x + bw) < (width - 10) and y > 10 and (y + bh) < (height - 10):
                    box = clamp_bbox([x, y, x + bw, y + bh], width, height)
                    area_pct = round((area / total_pixels) * 100.0, 4)
                    candidates.append(
                        DefectCandidate(
                            class_name="defect",
                            subtype="scratch",
                            bbox=box,
                            confidence=0.92,
                            area_pct=area_pct,
                            metadata={"contour_area": area, "method": "morphological_line"}
                        )
                    )

        # -------------------------------------------------------------
        # 4. Pinholes / Holidays (Small High-Contrast Discontinuities)
        # -------------------------------------------------------------
        # Pinholes are tight circular micro-anomalies
        pinhole_mask = cv2.inRange(gray, 0, 35)
        pinhole_contours, _ = cv2.findContours(pinhole_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in pinhole_contours:
            area = cv2.contourArea(c)
            if (total_pixels * 0.00005) < area < (total_pixels * 0.002):
                x, y, bw, bh = cv2.boundingRect(c)
                aspect = bw / float(bh) if bh > 0 else 0
                if 0.7 < aspect < 1.4:
                    box = clamp_bbox([x, y, x + bw, y + bh], width, height)
                    area_pct = round((area / total_pixels) * 100.0, 4)
                    candidates.append(
                        DefectCandidate(
                            class_name="defect",
                            subtype="pinhole",
                            bbox=box,
                            confidence=0.86,
                            area_pct=area_pct,
                            metadata={"contour_area": area, "method": "micro_holiday"}
                        )
                    )

        # Filter by confidence threshold and apply NMS
        filtered_candidates = [c for c in candidates if c.confidence >= confidence_threshold]
        final_detections = apply_nms(filtered_candidates, iou_threshold=0.45, max_detections=25)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return InferenceResult(
            detections=final_detections,
            model_name=self.name,
            model_version=self.version,
            framework="opencv",
            device=self.device,
            inference_time_ms=round(elapsed_ms, 2),
            image_width=orig_w,
            image_height=orig_h
        )
