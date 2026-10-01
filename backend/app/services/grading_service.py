"""
Standards Grading Service (Real Rules Engine).
Evaluates defect detections against AMPP / NACE / SSPC / ISO standards.
"""

from pathlib import Path
import yaml
import logging
from backend.app.config import GRADING_CONFIG_PATH

logger = logging.getLogger("grading_service")

class StandardsGradingEngine:
    def __init__(self, config_path: str | Path = GRADING_CONFIG_PATH):
        self.config_path = Path(config_path)
        self.rules = {}
        self.default_rule = {
            "standard_reference": "AMPP QP / Marine General Assessment",
            "severity": "Medium",
            "pass_fail": "REVIEW"
        }
        self.load_rules()

    def load_rules(self):
        try:
            if self.config_path.exists():
                with open(self.config_path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    self.rules = data.get("rules", {})
                    self.default_rule = data.get("default_rule", self.default_rule)
            else:
                logger.warning(f"Grading rules config not found at {self.config_path}. Using fallback.")
        except Exception as e:
            logger.error(f"Error loading grading config: {e}")

    def grade_detection(self, detection: dict, img_width: int, img_height: int) -> dict:
        bbox = detection.get("bbox", [0, 0, 0, 0])
        subtype = detection.get("subtype", "unknown")
        confidence = float(detection.get("confidence", 0.0))

        # Calculate defect area percentage relative to image
        w = max(0.0, float(bbox[2] - bbox[0]))
        h = max(0.0, float(bbox[3] - bbox[1]))
        box_area = w * h
        total_area = max(1.0, float(img_width * img_height))
        area_pct = round((box_area / total_area) * 100.0, 3)

        rule = self.rules.get(subtype)
        if not rule or "thresholds" not in rule:
            return {
                "standard_reference": self.default_rule.get("standard_reference", "AMPP QP Marine"),
                "severity": self.default_rule.get("severity", "Medium"),
                "pass_fail": self.default_rule.get("pass_fail", "REVIEW"),
                "area_pct": area_pct
            }

        standard_ref = rule.get("standard_reference", "AMPP / ISO Standard")
        for tier in rule["thresholds"]:
            max_area = tier.get("max_area_pct", 100.0)
            if area_pct <= max_area:
                return {
                    "standard_reference": standard_ref,
                    "severity": tier.get("severity", "Medium"),
                    "pass_fail": tier.get("pass_fail", "REVIEW"),
                    "area_pct": area_pct
                }

        # Fallback to the strictest tier
        last_tier = rule["thresholds"][-1]
        return {
            "standard_reference": standard_ref,
            "severity": last_tier.get("severity", "High"),
            "pass_fail": last_tier.get("pass_fail", "FAIL"),
            "area_pct": area_pct
        }

    def determine_overall_verdict(self, graded_records: list[dict]) -> str:
        if not graded_records:
            return "PASS"
        verdicts = [r.get("pass_fail", "PASS").upper() for r in graded_records]
        if "FAIL" in verdicts:
            return "FAIL"
        if "REVIEW" in verdicts:
            return "REVIEW"
        return "PASS"

grading_engine = StandardsGradingEngine()
