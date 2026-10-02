"""Defect measurement and computer vision geometry calculation service."""

from typing import Dict, Any, List
import numpy as np
import cv2

def compute_defect_measurements(
    bbox: List[float],
    image_width: int,
    image_height: int,
    image_np: np.ndarray = None
) -> Dict[str, Any]:
    """Calculates comprehensive defect geometric metrics and 3D surface depth proxies."""
    x1, y1, x2, y2 = bbox
    w = max(1.0, float(x2 - x1))
    h = max(1.0, float(y2 - y1))
    aspect_ratio = round(w / h, 3)

    total_pixels = float(image_width * image_height)
    bbox_pixel_area = float(w * h)
    area_pct = round((bbox_pixel_area / total_pixels) * 100.0, 4)

    centroid_x = round(float(x1 + (w / 2.0)), 2)
    centroid_y = round(float(y1 + (h / 2.0)), 2)

    surface_depth_proxy = None
    roughness_index = None

    if image_np is not None:
        try:
            ix1, iy1, ix2, iy2 = int(x1), int(y1), int(x2), int(y2)
            roi = image_np[iy1:iy2, ix1:ix2]
            if roi.size > 0:
                gray_roi = cv2.cvtColor(roi, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
                # Depth proxy: difference between local luminance anomaly and specimen mean
                depth_val = float(np.mean(gray_roi))
                surface_depth_proxy = round(float(abs(0.5 - depth_val) * 2.0), 4)

                # Roughness index via Sobel gradient magnitude
                gx = cv2.Sobel(gray_roi, cv2.CV_32F, 1, 0, ksize=3)
                gy = cv2.Sobel(gray_roi, cv2.CV_32F, 0, 1, ksize=3)
                grad_mag = np.sqrt(gx**2 + gy**2)
                roughness_index = round(float(np.mean(grad_mag)), 4)
        except Exception:
            pass

    return {
        "bbox_width": round(w, 2),
        "bbox_height": round(h, 2),
        "aspect_ratio": aspect_ratio,
        "pixel_area": round(bbox_pixel_area, 2),
        "area_pct": area_pct,
        "centroid_x": centroid_x,
        "centroid_y": centroid_y,
        "surface_depth_proxy": surface_depth_proxy,
        "roughness_index": roughness_index
    }
