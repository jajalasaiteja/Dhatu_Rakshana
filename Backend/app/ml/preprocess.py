"""Deterministic image preprocessing pipeline for marine coating inspection."""

from pathlib import Path
from typing import Tuple, Union, Optional
import numpy as np
from PIL import Image, ImageOps
import io
import logging

from app.core.exceptions import FileValidationError

logger = logging.getLogger("dhatu_rakshana.preprocess")

PREPROCESSING_VERSION = "1.0.0"

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"}
ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/bmp",
    "image/tiff",
    "image/webp"
}

def validate_image_bytes(image_bytes: bytes, filename: str, max_size_mb: int = 50) -> None:
    """Validates file extension, byte size, and non-empty payload."""
    if not image_bytes:
        raise FileValidationError(f"File {filename} is empty.")

    max_bytes = max_size_mb * 1024 * 1024
    if len(image_bytes) > max_bytes:
        raise FileValidationError(
            f"File {filename} exceeds maximum size limit of {max_size_mb}MB ({len(image_bytes) / (1024*1024):.1f}MB)."
        )

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise FileValidationError(
            f"File {filename} has unsupported format '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

def load_and_preprocess_image(
    source: Union[str, Path, bytes, Image.Image],
    target_size: Optional[Tuple[int, int]] = None
) -> Tuple[np.ndarray, Tuple[int, int]]:
    """
    Decodes image, handles EXIF orientation, validates dimensions,
    and returns (rgb_numpy_array, (original_width, original_height)).
    """
    try:
        if isinstance(source, (str, Path)):
            pil_img = Image.open(str(source))
        elif isinstance(source, bytes):
            pil_img = Image.open(io.BytesIO(source))
        elif isinstance(source, Image.Image):
            pil_img = source
        else:
            raise FileValidationError(f"Unsupported image input type: {type(source)}")

        # Automatically transpose image according to EXIF orientation tag
        pil_img = ImageOps.exif_transpose(pil_img)

        # Convert to standard RGB
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")

        orig_w, orig_h = pil_img.size

        if orig_w < 32 or orig_h < 32:
            raise FileValidationError(f"Image dimensions ({orig_w}x{orig_h}) too small for defect analysis.")

        if orig_w > 8192 or orig_h > 8192:
            raise FileValidationError(f"Image dimensions ({orig_w}x{orig_h}) exceed maximum allowable size (8192x8192).")

        if target_size:
            pil_img = pil_img.resize(target_size, Image.Resampling.BILINEAR)

        img_np = np.array(pil_img, dtype=np.uint8)
        return img_np, (orig_w, orig_h)

    except Exception as exc:
        if isinstance(exc, FileValidationError):
            raise
        logger.error(f"Image preprocessing failed: {exc}", exc_info=True)
        raise FileValidationError(f"Corrupt or unreadable image file: {exc}")
