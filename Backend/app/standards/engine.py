"""Standards Grading Engine for AMPP / NACE / SSPC / ISO naval coating compliance."""

from pathlib import Path
from typing import Dict, Any, List, Optional
import yaml
import logging

from app.core.config import settings
from app.core.exceptions import GradingError

logger = logging.getLogger("dhatu_rakshana.standards")

class StandardsGradingEngine:
    def __init__(self, config_path: Optional[Path] = None):
        self.config_path = config_path or Path(settings.GRADING_CONFIG_PATH)
        self.standards_info: Dict[str, Any] = {}
        self.rules: Dict[str, Any] = {}
        self.default_rule = {
            "standard_reference": "AMPP QP / Marine General Assessment",
            "rule_version": "2.1.0",
            "severity": "Medium",
            "pass_fail": "REVIEW"
        }
        self.load_rules()

    def load_rules(self):
        if not self.config_path.exists():
            logger.warning(f"Grading rules configuration not found at {self.config_path}. Using fallback rule.")
            return

        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
                self.standards_info = data.get("standards", {})
                self.rules = data.get("rules", {})
                self.default_rule = data.get("default_rule", self.default_rule)
                logger.info(f"Loaded {len(self.rules)} standards grading rules from {self.config_path.name}.")
        except Exception as exc:
            logger.error(f"Failed to parse standards grading configuration: {exc}")

    def grade_detection(
        self,
        subtype: str,
        area_pct: float,
        confidence: float
    ) -> Dict[str, Any]:
        """
        Evaluates a defect candidate against standards configuration.
        Returns evaluation record with standard reference, severity, pass/fail, and criteria.
        """
        clean_subtype = subtype.lower() if subtype else "unknown"
        rule = self.rules.get(clean_subtype)

        if not rule or "thresholds" not in rule:
            return {
                "standard_reference": self.default_rule.get("standard_reference", "AMPP QP Marine"),
                "rule_version": self.default_rule.get("rule_version", "2.1.0"),
                "severity": self.default_rule.get("severity", "Medium"),
                "pass_fail": self.default_rule.get("pass_fail", "REVIEW"),
                "notes": f"Evaluation performed under default marine standard for unclassified defect '{clean_subtype}'."
            }

        standard_ref = rule.get("standard_reference", "AMPP / ISO Standard")
        rule_ver = rule.get("rule_version", "2.1.0")

        # Evaluate against tiered thresholds
        for tier in rule["thresholds"]:
            max_area = float(tier.get("max_area_pct", 100.0))
            min_conf = float(tier.get("min_confidence", 0.0))

            if area_pct <= max_area and confidence >= min_conf:
                return {
                    "standard_reference": standard_ref,
                    "rule_version": rule_ver,
                    "severity": tier.get("severity", "Medium"),
                    "pass_fail": tier.get("pass_fail", "REVIEW"),
                    "notes": f"Coating area affected ({area_pct:.2f}%) within allowable threshold ({max_area}%)."
                }

        # Fallback to the most severe tier
        strictest = rule["thresholds"][-1]
        return {
            "standard_reference": standard_ref,
            "rule_version": rule_ver,
            "severity": strictest.get("severity", "High"),
            "pass_fail": strictest.get("pass_fail", "FAIL"),
            "notes": f"Coating area affected ({area_pct:.2f}%) exceeded maximum tolerance threshold."
        }

    def determine_overall_verdict(self, graded_records: List[Dict[str, Any]]) -> str:
        """Determines aggregated inspection verdict (FAIL > REVIEW > PASS)."""
        if not graded_records:
            return "PASS"

        verdicts = [str(r.get("pass_fail", "PASS")).upper() for r in graded_records]
        if "FAIL" in verdicts:
            return "FAIL"
        if "REVIEW" in verdicts:
            return "REVIEW"
        return "PASS"

# Global standards grading engine
standards_engine = StandardsGradingEngine()
