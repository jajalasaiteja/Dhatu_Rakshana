"""
AI Detection Service for Marine Defense Platform Coating Inspection.
"""

import random
from PIL import Image

def detect(image_path: str) -> list[dict]:
    """REPLACE WITH TRAINED YOLOv8 + ResNet MODEL"""
    try:
        with Image.open(image_path) as img:
            width, height = img.size
    except Exception:
        width, height = 640, 640

    num_boxes = random.randint(1, 4)
    detections = []
    subtypes = ["pinhole", "scratch", "inclusion", "contamination"]

    for _ in range(num_boxes):
        # 75% chance defect, 25% chance particle
        if random.random() < 0.75:
            cls = "defect"
            subtype = random.choice(subtypes)
        else:
            cls = "particle"
            subtype = "dust_particle"

        # Plausible bounding box (6% to 22% of total image dimension)
        box_w = random.uniform(0.06, 0.22) * width
        box_h = random.uniform(0.06, 0.22) * height

        # Ensure box stays within frame margins
        x_min = random.uniform(0.05 * width, max(0.05 * width, width - box_w - 0.05 * width))
        y_min = random.uniform(0.05 * height, max(0.05 * height, height - box_h - 0.05 * height))
        x_max = min(float(width), x_min + box_w)
        y_max = min(float(height), y_min + box_h)

        confidence = round(random.uniform(0.52, 0.98), 3)

        detections.append({
            "class": cls,
            "subtype": subtype,
            "bbox": [round(x_min, 1), round(y_min, 1), round(x_max, 1), round(y_max, 1)],
            "confidence": confidence
        })

    return detections
