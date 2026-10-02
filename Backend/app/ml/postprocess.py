"""Post-processing: IoU filtering, Non-Maximum Suppression, coordinate bounds clamping."""

from typing import List
from app.ml.base import DefectCandidate

def calculate_iou(box_a: List[float], box_b: List[float]) -> float:
    """Calculates Intersection over Union for two bounding boxes [x1, y1, x2, y2]."""
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])

    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area_a = max(0.0, box_a[2] - box_a[0]) * max(0.0, box_a[3] - box_a[1])
    area_b = max(0.0, box_b[2] - box_b[0]) * max(0.0, box_b[3] - box_b[1])

    union = area_a + area_b - intersection
    if union <= 0.0:
        return 0.0
    return intersection / union

def clamp_bbox(bbox: List[float], width: int, height: int) -> List[float]:
    """Ensures bounding box coordinates fall strictly within image boundary."""
    x1 = max(0.0, min(float(width), float(bbox[0])))
    y1 = max(0.0, min(float(height), float(bbox[1])))
    x2 = max(x1, min(float(width), float(bbox[2])))
    y2 = max(y1, min(float(height), float(bbox[3])))
    return [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)]

def apply_nms(
    candidates: List[DefectCandidate],
    iou_threshold: float = 0.45,
    max_detections: int = 30
) -> List[DefectCandidate]:
    """Applies Non-Maximum Suppression to eliminate overlapping detection boxes."""
    if not candidates:
        return []

    # Sort descending by confidence
    sorted_candidates = sorted(candidates, key=lambda c: c.confidence, reverse=True)
    selected: List[DefectCandidate] = []

    for candidate in sorted_candidates:
        suppress = False
        for chosen in selected:
            # Only suppress if bounding boxes overlap substantially
            iou = calculate_iou(candidate.bbox, chosen.bbox)
            if iou > iou_threshold:
                suppress = True
                break

        if not suppress:
            selected.append(candidate)
            if len(selected) >= max_detections:
                break

    return selected
