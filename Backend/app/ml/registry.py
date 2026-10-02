"""Model Registry for loading, caching, and dispatching ML/CV defect detection models."""

from pathlib import Path
from typing import Dict, Optional, List
import yaml
import torch
import logging

from app.core.config import settings, BACKEND_DIR, PROJECT_ROOT
from app.ml.base import BaseInferenceEngine
from app.ml.inference.classical_cv_runner import ClassicalCVRunner
from app.ml.inference.ultralytics_runner import UltralyticsRunner
from app.ml.inference.hybrid_runner import HybridDefectRunner

logger = logging.getLogger("dhatu_rakshana.registry")

class ModelRegistry:
    def __init__(self, config_path: Optional[Path] = None):
        self.config_path = config_path or Path(settings.MODEL_CONFIG_PATH)
        self._instances: Dict[str, BaseInferenceEngine] = {}
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._config = {}
        self.load_configuration()

    def load_configuration(self):
        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    self._config = yaml.safe_load(f) or {}
            except Exception as e:
                logger.error(f"Failed to load model config from {self.config_path}: {e}")
        else:
            logger.warning(f"Model config not found at {self.config_path}. Using internal defaults.")

    def get_model(self, model_name: Optional[str] = None) -> BaseInferenceEngine:
        """Returns initialized model instance from registry cache."""
        target_name = model_name or self._config.get("default_model", settings.DEFAULT_MODEL_NAME)

        if target_name in self._instances:
            return self._instances[target_name]

        # Instantiate runner based on configuration
        models_cfg = self._config.get("models", {})
        cfg = models_cfg.get(target_name, {})

        framework = cfg.get("framework", "hybrid")
        version = cfg.get("version", "1.0.0")
        weights_rel = cfg.get("weights_path")
        weights_path = None
        if weights_rel:
            p = Path(weights_rel)
            if p.is_absolute() and p.exists():
                weights_path = p
            elif (PROJECT_ROOT / p).exists():
                weights_path = PROJECT_ROOT / p
            elif (BACKEND_DIR / p).exists():
                weights_path = BACKEND_DIR / p
            else:
                weights_path = PROJECT_ROOT / p

        runner: BaseInferenceEngine
        if framework == "ultralytics":
            runner = UltralyticsRunner(
                name=target_name,
                version=version,
                weights_path=weights_path,
                device=self.device
            )
        elif framework == "opencv":
            runner = ClassicalCVRunner(
                name=target_name,
                version=version
            )
        else:
            # Default to Hybrid runner
            runner = HybridDefectRunner(
                name=target_name,
                version=version,
                weights_path=weights_path,
                device=self.device
            )

        runner.load_model()
        self._instances[target_name] = runner
        logger.info(f"Initialized model '{target_name}' (framework={framework}, device={self.device}).")
        return runner

    def list_available_models(self) -> List[dict]:
        models_cfg = self._config.get("models", {})
        result = []
        for name, info in models_cfg.items():
            result.append({
                "name": name,
                "version": info.get("version", "1.0.0"),
                "framework": info.get("framework", "hybrid"),
                "is_loaded": name in self._instances,
                "device": self.device
            })
        return result

# Global registry singleton
model_registry = ModelRegistry()
