"""Base classes and data contracts for ML/CV inference engines."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Union
import numpy as np
from pathlib import Path

@dataclass
class DefectCandidate:
    class_name: str
    subtype: str
    bbox: List[float]  # [x_min, y_min, x_max, y_max]
    confidence: float
    area_pct: Optional[float] = 0.0
    severity: Optional[str] = "Medium"
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "class": self.class_name,
            "subtype": self.subtype,
            "bbox": [round(float(c), 2) for c in self.bbox],
            "confidence": round(float(self.confidence), 4),
            "area_pct": round(float(self.area_pct), 4) if self.area_pct is not None else 0.0,
            "severity": self.severity,
            "metadata": self.metadata
        }

@dataclass
class InferenceResult:
    detections: List[DefectCandidate]
    model_name: str
    model_version: str
    framework: str
    device: str
    inference_time_ms: float
    image_width: int
    image_height: int

class BaseInferenceEngine(ABC):
    def __init__(self, name: str, version: str, device: str = "cpu"):
        self.name = name
        self.version = version
        self.device = device
        self.is_loaded = False

    @abstractmethod
    def load_model(self) -> bool:
        """Loads model weights into memory/device."""
        pass

    @abstractmethod
    def predict(
        self,
        image_input: Union[str, Path, np.ndarray],
        confidence_threshold: float = 0.45
    ) -> InferenceResult:
        """Executes inference on image and returns standard InferenceResult."""
        pass

    @abstractmethod
    def unload_model(self):
        """Releases resources and model weights from memory."""
        pass
