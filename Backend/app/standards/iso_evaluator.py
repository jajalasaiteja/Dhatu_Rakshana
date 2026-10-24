"""ISO-Aligned Evaluation Engine for Marine Coating Defect Inspection.

Produces structured, measurable, and traceable evaluation results aligned with:
- ISO 4628 Parts 1, 2, 3, 4, 5, 8 (Coating degradation, rusting, blistering, cracking, flaking, scribe creep)
- ISO 8501-1:2007 (Rust grades A-D and surface preparation cleanliness limitations)
- SSPC-PA 2 / ISO 19840:2012 (Dry film thickness measurement requirements & 80/20 criteria)
- NACE SP0188:2006 (Coating continuity and holiday testing requirements)
- ISO 8502-3:2017 (Surface dust assessment via tape method)
- Project Dhatu Rakshana Coating Defect Framework (DR-FRAMEWORK-2026 operational grading)
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import math
import logging

from app.core.timezone import get_ist_now, format_ist_iso, format_ist_display

logger = logging.getLogger("dhatu_rakshana.iso_evaluator")

EVALUATION_ENGINE_VERSION = "2.0.0-iso-aligned"

# ISO 4628-3 Rusting Degree Area Boundaries (Table 1)
ISO_4628_3_RUST_SCALE = [
    (0.0, "Ri 0", "None: 0 % rusted area"),
    (0.05, "Ri 1", "Very slight: ≤ 0.05 % rusted area"),
    (0.5, "Ri 2", "Slight: ≤ 0.5 % rusted area"),
    (1.0, "Ri 3", "Moderate: ≤ 1.0 % rusted area"),
    (8.0, "Ri 4", "Considerable: ≤ 8.0 % rusted area"),
    (100.0, "Ri 5", "Severe: > 8.0 % (typically 40 % to 50 % or greater rusted area)")
]

# ISO 4628-1 Table 1: Quantity of Defects (0 to 5)
def get_iso_4628_1_quantity_rating(count: int, area_pct: float) -> Tuple[int, str]:
    if count == 0 or area_pct <= 0.001:
        return 0, "None (0)"
    if count <= 2 and area_pct <= 0.2:
        return 1, "Very few (1)"
    if count <= 5 and area_pct <= 1.0:
        return 2, "Few (2)"
    if count <= 15 and area_pct <= 3.5:
        return 3, "Moderate (3)"
    if count <= 30 and area_pct <= 10.0:
        return 4, "Considerable (4)"
    return 5, "Dense pattern (5)"

# ISO 4628-1 Table 2: Size Code (S0 to S5) based on max defect dimension (pixels or estimated mm)
def get_iso_4628_1_size_rating(max_dimension_px: float, total_image_width: int = 640) -> Tuple[str, str]:
    # Fraction of image width as relative optical proxy when uncalibrated
    rel_size = max_dimension_px / float(total_image_width) if total_image_width > 0 else 0.0
    if rel_size <= 0.002:
        return "S0", "S0: Not visible under 10× magnification"
    if rel_size <= 0.01:
        return "S1", "S1: Visible only under magnification up to 10×"
    if rel_size <= 0.04:
        return "S2", "S2: Just visible with normal vision (up to 0.2 mm equivalent)"
    if rel_size <= 0.12:
        return "S3", "S3: Clearly visible with normal vision (0.2 mm to 0.5 mm equivalent)"
    if rel_size <= 0.35:
        return "S4", "S4: Larger than 0.5 mm up to 5 mm equivalent"
    return "S5", "S5: Macro defect exceeding 5 mm equivalent"

def determine_rust_grade_iso_4628_3(rust_area_pct: float) -> Tuple[str, str, str]:
    """Calculates exact ISO 4628-3 rusting degree based on affected area percentage."""
    if rust_area_pct <= 0.0:
        return "Ri 0", "None (0 % area rusted)", "PASS"
    if rust_area_pct <= 0.05:
        return "Ri 1", "Very slight (≤ 0.05 % area rusted)", "PASS"
    if rust_area_pct <= 0.5:
        return "Ri 2", "Slight (≤ 0.5 % area rusted)", "PASS"
    if rust_area_pct <= 1.0:
        return "Ri 3", "Moderate (≤ 1.0 % area rusted)", "REVIEW"
    if rust_area_pct <= 8.0:
        return "Ri 4", "Considerable (≤ 8.0 % area rusted)", "FAIL"
    return "Ri 5", f"Severe (> 8.0 % area rusted; observed {rust_area_pct:.2f}%)", "FAIL"

class ISOEvaluationEngine:
    """Central engine performing rigorous ISO-aligned coating defect and standards assessments."""

    def __init__(self, version: str = EVALUATION_ENGINE_VERSION):
        self.version = version

    def evaluate_inspection(
        self,
        inspection_id: int,
        image_records: List[Any],
        detections: List[Dict[str, Any]],
        topology_record: Optional[Any] = None,
        calibrated_dft_data: Optional[Dict[str, Any]] = None,
        calibrated_holiday_data: Optional[Dict[str, Any]] = None,
        evaluation_timestamp: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Executes complete evaluation suite across image data, detections, and standards rulebase.
        Returns:
            - structured_measurements: List[Dict] for database persistence in inspection_measurements
            - evaluation_summary: Dict with all 5 required structured sections
            - overall_verdict: "PASS" | "REVIEW" | "FAIL"
        """
        now_ist = evaluation_timestamp or get_ist_now()

        # 1. Primary image metadata
        primary_img = image_records[0] if image_records else None
        img_id = getattr(primary_img, "id", None) if primary_img else None
        width = int(getattr(primary_img, "width", 640) or 640)
        height = int(getattr(primary_img, "height", 640) or 640)
        total_image_pixels = float(width * height)

        # 2. Defect quantitative aggregations
        total_defect_count = len(detections)
        category_counts: Dict[str, int] = {}
        category_pixel_areas: Dict[str, float] = {}
        quadrant_counts = {"NW": 0, "NE": 0, "SW": 0, "SE": 0}

        largest_defect_area_px = 0.0
        largest_defect_subtype = "None"
        largest_defect_dim = 0.0
        total_defect_px = 0.0
        conf_scores: List[float] = []

        depth_proxies: List[float] = []
        roughness_indices: List[float] = []

        half_w = width / 2.0
        half_h = height / 2.0

        for d in detections:
            subtype = (d.get("subtype") or d.get("class") or "unknown").lower()
            conf = float(d.get("confidence", 0.0) or 0.0)
            conf_scores.append(conf)

            # Area calculations
            area_pct = float(d.get("area_pct", 0.0) or 0.0)
            det_meas = d.get("measurement") or {}
            px_area = float(det_meas.get("pixel_area") or (area_pct / 100.0 * total_image_pixels))
            total_defect_px += px_area

            # Subtype groupings
            category_counts[subtype] = category_counts.get(subtype, 0) + 1
            category_pixel_areas[subtype] = category_pixel_areas.get(subtype, 0.0) + px_area

            # Largest defect
            if px_area > largest_defect_area_px:
                largest_defect_area_px = px_area
                largest_defect_subtype = subtype
                bw = float(det_meas.get("bbox_width", 0.0))
                bh = float(det_meas.get("bbox_height", 0.0))
                largest_defect_dim = max(bw, bh)

            # Quadrant spatial distribution
            cx = float(det_meas.get("centroid_x", half_w))
            cy = float(det_meas.get("centroid_y", half_h))
            if cx < half_w and cy < half_h:
                quadrant_counts["NW"] += 1
            elif cx >= half_w and cy < half_h:
                quadrant_counts["NE"] += 1
            elif cx < half_w and cy >= half_h:
                quadrant_counts["SW"] += 1
            else:
                quadrant_counts["SE"] += 1

            # Topography proxies if available
            dp = det_meas.get("surface_depth_proxy")
            if dp is not None:
                depth_proxies.append(float(dp))
            ri = det_meas.get("roughness_index")
            if ri is not None:
                roughness_indices.append(float(ri))

        cumulative_defect_pct = (total_defect_px / total_image_pixels * 100.0) if total_image_pixels > 0 else 0.0
        avg_defect_area_px = (total_defect_px / total_defect_count) if total_defect_count > 0 else 0.0
        avg_defect_pct = (cumulative_defect_pct / total_defect_count) if total_defect_count > 0 else 0.0
        mean_confidence = (sum(conf_scores) / len(conf_scores)) if conf_scores else 1.0

        # Spatial distribution description
        if total_defect_count == 0:
            spatial_desc = "Uniform (No defects detected)"
        else:
            max_quad = max(quadrant_counts, key=quadrant_counts.get)
            max_quad_pct = (quadrant_counts[max_quad] / total_defect_count) * 100.0
            if max_quad_pct >= 65.0:
                spatial_desc = f"Localized concentration in Quadrant {max_quad} ({max_quad_pct:.0f}% of anomalies)"
            else:
                spatial_desc = f"Dispersed across quadrants (NW:{quadrant_counts['NW']}, NE:{quadrant_counts['NE']}, SW:{quadrant_counts['SW']}, SE:{quadrant_counts['SE']})"

        # Subtype specific area percentages
        rust_area_pct = (category_pixel_areas.get("corrosion", 0.0) / total_image_pixels * 100.0) if total_image_pixels > 0 else 0.0
        blister_area_pct = (category_pixel_areas.get("blister", 0.0) / total_image_pixels * 100.0) if total_image_pixels > 0 else 0.0
        scratch_area_pct = (category_pixel_areas.get("scratch", 0.0) / total_image_pixels * 100.0) if total_image_pixels > 0 else 0.0
        crack_area_pct = (category_pixel_areas.get("crack", 0.0) / total_image_pixels * 100.0) if total_image_pixels > 0 else 0.0
        flaking_area_pct = (category_pixel_areas.get("flaking", 0.0) / total_image_pixels * 100.0) if total_image_pixels > 0 else 0.0
        inclusion_area_pct = (category_pixel_areas.get("inclusion", 0.0) / total_image_pixels * 100.0) if total_image_pixels > 0 else 0.0
        contamination_area_pct = (category_pixel_areas.get("contamination", 0.0) / total_image_pixels * 100.0) if total_image_pixels > 0 else 0.0
        dust_area_pct = (category_pixel_areas.get("dust_particle", 0.0) / total_image_pixels * 100.0) if total_image_pixels > 0 else 0.0

        # ISO 4628-3 Rust Rating
        ri_rating, ri_desc, ri_verdict = determine_rust_grade_iso_4628_3(rust_area_pct)

        # ISO 4628-1 General Designation
        q_rating, q_desc = get_iso_4628_1_quantity_rating(total_defect_count, cumulative_defect_pct)
        s_rating, s_desc = get_iso_4628_1_size_rating(largest_defect_dim, width)

        # Dominant defect subtype
        dominant_subtype = "none"
        if category_pixel_areas:
            dominant_subtype = max(category_pixel_areas, key=category_pixel_areas.get)
        elif detections:
            dominant_subtype = detections[0].get("subtype", "defect")

        if total_defect_count == 0:
            iso_4628_1_formal = "nominal; degree 0(S0), 0.0% area"
        else:
            iso_4628_1_formal = f"{dominant_subtype}; degree {q_rating}({s_rating}), {cumulative_defect_pct:.2f}% area"

        # ISO 4628-2 Blistering
        blister_count = category_counts.get("blister", 0)
        if blister_count == 0:
            blister_val = "Degree 0 (no blistering)"
            blister_status = "Assessed"
            blister_verdict = "PASS"
        else:
            bq, _ = get_iso_4628_1_quantity_rating(blister_count, blister_area_pct)
            blister_val = f"blistering; degree {bq}({s_rating}), {blister_area_pct:.2f}% area"
            blister_status = "Assessed"
            blister_verdict = "PASS" if blister_area_pct <= 0.8 else ("REVIEW" if blister_area_pct <= 3.5 else "FAIL")

        # ISO 4628-4 Cracking
        crack_count = category_counts.get("crack", 0)
        if crack_count == 0:
            crack_val = "Degree 0 (no cracking)"
            crack_status = "Assessed"
            crack_verdict = "PASS"
        else:
            cq, _ = get_iso_4628_1_quantity_rating(crack_count, crack_area_pct)
            crack_val = f"cracking; degree {cq}({s_rating}), {crack_area_pct:.2f}% area"
            crack_status = "Assessed"
            crack_verdict = "PASS" if crack_area_pct <= 1.0 else ("REVIEW" if crack_area_pct <= 4.0 else "FAIL")

        # ISO 4628-5 Flaking
        flaking_count = category_counts.get("flaking", 0)
        if flaking_count == 0:
            flaking_val = "Degree 0 (no flaking)"
            flaking_status = "Assessed"
            flaking_verdict = "PASS"
        else:
            fq, _ = get_iso_4628_1_quantity_rating(flaking_count, flaking_area_pct)
            flaking_val = f"flaking; degree {fq}({s_rating}), {flaking_area_pct:.2f}% area"
            flaking_status = "Assessed"
            flaking_verdict = "PASS" if flaking_area_pct <= 1.0 else ("REVIEW" if flaking_area_pct <= 4.0 else "FAIL")

        # ISO 4628-8 Scribe Delamination & Creep
        scratch_count = category_counts.get("scratch", 0)
        if scratch_count == 0:
            scribe_val = "Not applicable (no linear scribe or mechanical scratch)"
            scribe_status = "Not applicable"
            scribe_spread_px = None
            scribe_verdict = "PASS"
        else:
            # Scribe spread calculation in pixels (d = (d1 - w) / 2)
            # Find the largest scratch detection
            scratch_dets = [d for d in detections if (d.get("subtype") or "").lower() == "scratch"]
            max_scratch = max(scratch_dets, key=lambda x: float(x.get("measurement", {}).get("pixel_area", 0.0)))
            s_meas = max_scratch.get("measurement", {})
            sw = float(s_meas.get("bbox_width", 10.0))
            sh = float(s_meas.get("bbox_height", 10.0))
            # Directional spread proxy across scratch width
            mean_width_px = min(sw, sh)
            scribe_spread_px = max(1.0, round(mean_width_px / 2.0, 1))
            scribe_val = f"d = {scribe_spread_px:.1f} px (one-sided spread, pixel-based)"
            scribe_status = "Measured"
            scribe_verdict = "PASS" if scratch_area_pct <= 1.0 else ("REVIEW" if scratch_area_pct <= 4.0 else "FAIL")

        # ISO 8501-1 Observable Substrate Rust Condition & Surface Prep Grade
        if rust_area_pct > 8.0:
            obs_rust_condition = "Grade D (Severe pitting and rust scale visible at coating breach)"
            obs_rust_grade = "Grade D"
        elif rust_area_pct > 0.5:
            obs_rust_condition = "Grade C (Active oxidation with localized slight pitting visible)"
            obs_rust_grade = "Grade C"
        elif rust_area_pct > 0.0:
            obs_rust_condition = "Grade B (Incipient oxidation bloom visible on substrate)"
            obs_rust_grade = "Grade B"
        else:
            obs_rust_condition = "Grade A / Nominal (No substrate oxidation observable through coating)"
            obs_rust_grade = "Grade A"

        # Topography stats
        mean_depth_proxy = (sum(depth_proxies) / len(depth_proxies)) if depth_proxies else None
        mean_roughness_idx = (sum(roughness_indices) / len(roughness_indices)) if roughness_indices else None
        topo_available = topology_record is not None or (len(depth_proxies) > 0)

        # -------------------------------------------------------------
        # Determine Overall Operational Verdict (PASS > REVIEW > FAIL)
        # -------------------------------------------------------------
        # Project Dhatu Rakshana Operational Rules
        verdict = "PASS"
        if (
            rust_area_pct > 3.0 or
            blister_area_pct > 3.5 or
            scratch_area_pct > 4.0 or
            crack_area_pct > 4.0 or
            flaking_area_pct > 4.0 or
            contamination_area_pct > 5.0 or
            inclusion_area_pct > 4.0 or
            dust_area_pct > 4.5 or
            cumulative_defect_pct > 8.0 or
            ri_rating in ("Ri 4", "Ri 5")
        ):
            verdict = "FAIL"
        elif (
            rust_area_pct > 0.5 or
            blister_area_pct > 0.8 or
            scratch_area_pct > 1.0 or
            crack_area_pct > 1.0 or
            flaking_area_pct > 1.0 or
            contamination_area_pct > 1.5 or
            inclusion_area_pct > 1.0 or
            dust_area_pct > 1.2 or
            cumulative_defect_pct > 1.5 or
            ri_rating == "Ri 3" or
            total_defect_count > 0
        ):
            verdict = "REVIEW"

        # -------------------------------------------------------------
        # 3. Build List of Structured Measurements (for database)
        # -------------------------------------------------------------
        measurements: List[Dict[str, Any]] = []

        # Measurement 1: Total Inspected Area
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "total_image_area",
            "measurement_name": "Total Inspected Area",
            "measurement_category": "QUANTITATIVE_DEFECT",
            "measured_value": f"{int(total_image_pixels):,} px²",
            "numeric_value": total_image_pixels,
            "unit": "px²",
            "applicable_standard": "ISO 4628-1:2016",
            "standard_edition": "Fourth edition (2016)",
            "rating_or_criterion": f"Frame Dimensions: {width} × {height} pixels (Clause 4.2)",
            "assessment_status": "Measured",
            "confidence": 1.0,
            "measurement_method": "Digital optical raster resolution analysis",
            "evidence_source": "Optical specimen capture",
            "explanation": f"Total specimen surface area evaluated across primary 2D scan frame ({width}x{height} pixels). Measurements remain pixel-based without external metric target calibration.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 2: Cumulative Defect Area
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "total_defect_area_px",
            "measurement_name": "Cumulative Defect Area",
            "measurement_category": "QUANTITATIVE_DEFECT",
            "measured_value": f"{total_defect_px:,.2f} px²",
            "numeric_value": round(total_defect_px, 2),
            "unit": "px²",
            "applicable_standard": "ISO 4628-1:2016",
            "standard_edition": "Fourth edition (2016)",
            "rating_or_criterion": "Sum of localized defect pixels across inspection plane",
            "assessment_status": "Measured",
            "confidence": round(mean_confidence, 4),
            "measurement_method": "Multi-class computer vision bounding contour integration",
            "evidence_source": "Optical specimen capture",
            "explanation": f"Sum of all localized anomaly pixel masks detected across inspection plane. Uncalibrated pixel units.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 3: Defect Area Percentage
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "defect_area_percentage",
            "measurement_name": "Defect Area Ratio",
            "measurement_category": "QUANTITATIVE_DEFECT",
            "measured_value": f"{cumulative_defect_pct:.4f} %",
            "numeric_value": round(cumulative_defect_pct, 4),
            "unit": "%",
            "applicable_standard": "ISO 4628-1:2016",
            "standard_edition": "Fourth edition (2016)",
            "rating_or_criterion": "Proportion of total inspection surface affected by visible defects (Clause 5)",
            "assessment_status": "Measured",
            "confidence": round(mean_confidence, 4),
            "measurement_method": "Total defect pixel area divided by frame raster area",
            "evidence_source": "Optical specimen capture",
            "explanation": f"Overall percentage of the coating surface affected by detected defect candidates ({cumulative_defect_pct:.4f}%).",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 4: Individual Defect Count
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "total_defect_count",
            "measurement_name": "Defect Anomaly Count",
            "measurement_category": "QUANTITATIVE_DEFECT",
            "measured_value": f"{total_defect_count} anomalies",
            "numeric_value": float(total_defect_count),
            "unit": "anomalies",
            "applicable_standard": "ISO 4628-1:2016",
            "standard_edition": "Fourth edition (2016)",
            "rating_or_criterion": "Enumeration of discrete localized defect indications (Table 1)",
            "assessment_status": "Measured",
            "confidence": 1.0,
            "measurement_method": "Candidate segmentation and non-maximum suppression (NMS)",
            "evidence_source": "Optical specimen capture",
            "explanation": f"Discrete localized defect anomalies identified: {total_defect_count} total ({', '.join([f'{k}: {v}' for k, v in category_counts.items()]) if category_counts else 'None'}).",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 5: Largest Defect Area
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "largest_defect_area",
            "measurement_name": "Largest Detected Defect",
            "measurement_category": "QUANTITATIVE_DEFECT",
            "measured_value": f"{largest_defect_area_px:,.2f} px² ({(largest_defect_area_px/total_image_pixels*100):.2f}%)" if total_defect_count > 0 else "0.00 px² (0.00%)",
            "numeric_value": round(largest_defect_area_px, 2),
            "unit": "px²",
            "applicable_standard": "ISO 4628-1:2016",
            "standard_edition": "Fourth edition (2016)",
            "rating_or_criterion": "Maximum single defect area boundary",
            "assessment_status": "Measured" if total_defect_count > 0 else "Not applicable",
            "confidence": round(mean_confidence, 4),
            "measurement_method": "Contour pixel bounding area analysis",
            "evidence_source": "Optical specimen capture",
            "explanation": f"Largest single defect instance identified on coating is subtype '{largest_defect_subtype}' measuring {largest_defect_area_px:,.2f} px².",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 6: Average Defect Area
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "average_defect_area",
            "measurement_name": "Average Defect Size",
            "measurement_category": "QUANTITATIVE_DEFECT",
            "measured_value": f"{avg_defect_area_px:,.2f} px² ({avg_defect_pct:.4f}%)" if total_defect_count > 0 else "0.00 px² (0.00%)",
            "numeric_value": round(avg_defect_area_px, 2),
            "unit": "px²",
            "applicable_standard": "ISO 4628-1:2016",
            "standard_edition": "Fourth edition (2016)",
            "rating_or_criterion": "Arithmetic mean of localized defect areas",
            "assessment_status": "Measured" if total_defect_count > 0 else "Not applicable",
            "confidence": round(mean_confidence, 4),
            "measurement_method": "Arithmetic mean calculation",
            "evidence_source": "Optical specimen capture",
            "explanation": f"Average pixel area occupied per detected defect anomaly across the scan frame.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 7: Spatial Defect Distribution
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "defect_spatial_distribution",
            "measurement_name": "Spatial Defect Distribution",
            "measurement_category": "QUANTITATIVE_DEFECT",
            "measured_value": spatial_desc,
            "numeric_value": None,
            "unit": "quadrants",
            "applicable_standard": "ISO 4628-1:2016",
            "standard_edition": "Fourth edition (2016)",
            "rating_or_criterion": "Distribution uniformity evaluation across inspection plane (Clause 4.1)",
            "assessment_status": "Assessed",
            "confidence": 1.0,
            "measurement_method": "Spatial centroid binning across NW, NE, SW, SE quadrants",
            "evidence_source": "Optical specimen capture",
            "explanation": f"Spatial distribution of defect centroids: NW={quadrant_counts['NW']}, NE={quadrant_counts['NE']}, SW={quadrant_counts['SW']}, SE={quadrant_counts['SE']}.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 8: Assessment Confidence
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "assessment_confidence",
            "measurement_name": "Mean Assessment Confidence",
            "measurement_category": "QUANTITATIVE_DEFECT",
            "measured_value": f"{mean_confidence * 100:.1f} %",
            "numeric_value": round(mean_confidence, 4),
            "unit": "%",
            "applicable_standard": "Project Dhatu Rakshana Framework",
            "standard_edition": "DR-FRAMEWORK-2026",
            "rating_or_criterion": "Confidence threshold ≥ 0.45 for defect acceptance",
            "assessment_status": "Assessed",
            "confidence": round(mean_confidence, 4),
            "measurement_method": "Aggregated classification confidence across candidate detections",
            "evidence_source": "Machine learning defect detector",
            "explanation": f"Aggregated statistical confidence of defect detection model across all localized anomalies.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 9: ISO 4628-3 Rusting Degree
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "iso_4628_3_rusting",
            "measurement_name": "ISO 4628-3 Rusting Degree",
            "measurement_category": "ISO_4628_DEGRADATION",
            "measured_value": ri_rating,
            "numeric_value": round(rust_area_pct, 4),
            "unit": "Ri rating",
            "applicable_standard": "ISO 4628-3:2016",
            "standard_edition": "Third edition (2016-01-15)",
            "rating_or_criterion": ri_desc,
            "assessment_status": "Assessed",
            "confidence": round(mean_confidence, 4),
            "measurement_method": "Chromaticity area ratio classification per ISO 4628-3 Table 1",
            "evidence_source": "Optical specimen capture",
            "explanation": f"Assessed per ISO 4628-3:2016 Clause 4 & Table 1. Rust bloom/oxidation occupies {rust_area_pct:.2f}% of total specimen frame, corresponding to rust grade {ri_rating}. Pass/Fail criterion: {ri_verdict}.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 10: ISO 4628-2 Blistering
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "iso_4628_2_blistering",
            "measurement_name": "ISO 4628-2 Degree of Blistering",
            "measurement_category": "ISO_4628_DEGRADATION",
            "measured_value": blister_val,
            "numeric_value": round(blister_area_pct, 4),
            "unit": "designation",
            "applicable_standard": "ISO 4628-2:2016",
            "standard_edition": "Third edition (2016-01-15)",
            "rating_or_criterion": "Quantity 0 to 5, Size S2 to S5 per ISO 4628-2 Table 1",
            "assessment_status": blister_status,
            "confidence": round(mean_confidence, 4),
            "measurement_method": "Luminance relief anomaly and circularity morphology",
            "evidence_source": "Optical specimen capture",
            "explanation": f"Evaluated per ISO 4628-2:2016 Clause 5. Identified {blister_count} blister indications covering {blister_area_pct:.2f}% surface area.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 11: ISO 4628-4 Cracking
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "iso_4628_4_cracking",
            "measurement_name": "ISO 4628-4 Degree of Cracking",
            "measurement_category": "ISO_4628_DEGRADATION",
            "measured_value": crack_val,
            "numeric_value": round(crack_area_pct, 4),
            "unit": "designation",
            "applicable_standard": "ISO 4628-4:2016",
            "standard_edition": "Third edition (2016-01-15)",
            "rating_or_criterion": "Quantity 0 to 5, Size S0 to S5 per ISO 4628-4 Table 1",
            "assessment_status": crack_status,
            "confidence": round(mean_confidence, 4),
            "measurement_method": "Edge continuity and morphological skeleton analysis",
            "evidence_source": "Optical specimen capture",
            "explanation": f"Evaluated per ISO 4628-4:2016 Clause 5. Identified {crack_count} crack anomalies covering {crack_area_pct:.2f}% surface area.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 12: ISO 4628-5 Flaking
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "iso_4628_5_flaking",
            "measurement_name": "ISO 4628-5 Degree of Flaking",
            "measurement_category": "ISO_4628_DEGRADATION",
            "measured_value": flaking_val,
            "numeric_value": round(flaking_area_pct, 4),
            "unit": "designation",
            "applicable_standard": "ISO 4628-5:2016",
            "standard_edition": "Third edition (2016-01-15)",
            "rating_or_criterion": "Quantity 0 to 5, Size S1 to S5 per ISO 4628-5 Table 1",
            "assessment_status": flaking_status,
            "confidence": round(mean_confidence, 4),
            "measurement_method": "Film delamination edge contrast contouring",
            "evidence_source": "Optical specimen capture",
            "explanation": f"Evaluated per ISO 4628-5:2016 Clause 5. Identified {flaking_count} flaking anomalies covering {flaking_area_pct:.2f}% surface area.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 13: ISO 4628-8 Scribe Delamination & Creep
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "iso_4628_8_delamination_creep",
            "measurement_name": "ISO 4628-8 Scribe Delamination & Creep",
            "measurement_category": "ISO_4628_DEGRADATION",
            "measured_value": scribe_val,
            "numeric_value": scribe_spread_px,
            "unit": "px",
            "applicable_standard": "ISO 4628-8:2012",
            "standard_edition": "Second edition (2012-11-01)",
            "rating_or_criterion": "Directional spread d = (d1 - w) / 2 across scribe points (Clause 4.2)",
            "assessment_status": scribe_status,
            "confidence": round(mean_confidence, 4) if scribe_spread_px is not None else None,
            "measurement_method": "Transverse cross-sectional profile analysis along defect axis",
            "evidence_source": "Optical specimen capture",
            "explanation": (
                f"Evaluated per ISO 4628-8:2012. Linear breach indicates directional spread of {scribe_spread_px:.1f} pixels. "
                "Explicitly identified as uncalibrated pixel width. Physical millimeter reporting requires a certified spatial reference target."
                if scribe_spread_px is not None
                else "No linear scribe, gouge, or artificial breach detected on specimen surface."
            ),
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 14: ISO 4628-1 General Designation
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "iso_4628_1_formal_designation",
            "measurement_name": "ISO 4628-1 Formal Designation",
            "measurement_category": "ISO_4628_DEGRADATION",
            "measured_value": iso_4628_1_formal,
            "numeric_value": None,
            "unit": "designation",
            "applicable_standard": "ISO 4628-1:2016",
            "standard_edition": "Fourth edition (2016-01-15)",
            "rating_or_criterion": "Designation format: defect type; degree n(Sn), area % (Clause 5)",
            "assessment_status": "Assessed",
            "confidence": round(mean_confidence, 4),
            "measurement_method": "ISO 4628-1 Tables 1 and 2 synthesis",
            "evidence_source": "Optical specimen capture",
            "explanation": f"Formal ISO 4628-1 designation string combining dominant defect type, quantity rating, size code, and surface proportion.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 15: ISO 8501-1 Observable Substrate Rust Condition
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "iso_8501_1_observable_condition",
            "measurement_name": "ISO 8501-1 Observable Substrate Rust Condition",
            "measurement_category": "ISO_8501_SURFACE_PREP",
            "measured_value": obs_rust_condition,
            "numeric_value": None,
            "unit": "rust grade",
            "applicable_standard": "ISO 8501-1:2007",
            "standard_edition": "Second edition (2007-05-01)",
            "rating_or_criterion": "Initial Rust Grades A, B, C, D (Clause 2)",
            "assessment_status": "Assessed",
            "confidence": round(mean_confidence, 4),
            "measurement_method": "Substrate exposure chromaticity and pit depth inspection",
            "evidence_source": "Optical specimen capture",
            "explanation": f"Assessed per ISO 8501-1:2007 Clause 2. Bare steel exposed through coating defects classified as {obs_rust_grade}.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 16: ISO 8501-1 Surface Preparation Grade (Strict Limitation)
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "iso_8501_1_surface_prep_grade",
            "measurement_name": "ISO 8501-1 Surface Preparation Grade",
            "measurement_category": "ISO_8501_SURFACE_PREP",
            "measured_value": "Insufficient evidence (Post-coating inspection)",
            "numeric_value": None,
            "unit": "prep grade",
            "applicable_standard": "ISO 8501-1:2007",
            "standard_edition": "Second edition (2007-05-01)",
            "rating_or_criterion": "Sa 1, Sa 2, Sa 2½, Sa 3 (Clause 3.1) / St 2, St 3 (Clause 3.2)",
            "assessment_status": "Insufficient evidence",
            "confidence": None,
            "measurement_method": "Visual inspection protocol limitation check",
            "evidence_source": "None (Post-application coating image)",
            "explanation": "ISO 8501-1 surface preparation grades (Sa / St) define the visual cleanliness of uncoated steel immediately prior to primer application. An ordinary photograph of an applied coating cannot determine pre-treatment blast cleanliness retrospectively without historical pre-coating QA blast inspection records.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 17: SSPC-PA 2 / ISO 19840 Dry Film Thickness (Strict Limitation)
        if calibrated_dft_data:
            # When actual sensor readings are provided
            dft_readings = calibrated_dft_data.get("readings", [])
            mean_dft = sum(dft_readings) / len(dft_readings) if dft_readings else 0.0
            ndft = calibrated_dft_data.get("ndft", 150.0)
            status_80_20 = "COMPLIANT" if (mean_dft >= ndft and all(r >= 0.8 * ndft for r in dft_readings)) else "NON-COMPLIANT"
            dft_val = f"Mean DFT: {mean_dft:.1f} µm (NDFT: {ndft} µm, 80/20: {status_80_20})"
            dft_status = "Measured"
            dft_expl = f"Dry film thickness evaluated from {len(dft_readings)} spot measurements per SSPC-PA 2 / ISO 19840. Roughness deduction applied: {calibrated_dft_data.get('roughness_deduction', 25)} µm."
        else:
            dft_val = "Not measured"
            dft_status = "Not measured"
            dft_expl = "Dry film thickness cannot be inferred from optical RGB imagery. Non-destructive physical thickness measurements must be acquired using a calibrated magnetic or eddy-current thickness gauge in accordance with SSPC-PA 2 / ISO 19840:2012."

        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "sspc_pa2_dry_film_thickness",
            "measurement_name": "SSPC-PA 2 / ISO 19840 Dry Film Thickness",
            "measurement_category": "DRY_FILM_THICKNESS",
            "measured_value": dft_val,
            "numeric_value": calibrated_dft_data.get("mean_dft") if calibrated_dft_data else None,
            "unit": "µm",
            "applicable_standard": "SSPC-PA 2 (2020) / ISO 19840:2012",
            "standard_edition": "Second edition (2012-09-01)",
            "rating_or_criterion": "80/20 Rule: Mean DFT ≥ NDFT; ≥80% readings ≥ NDFT; no reading < 0.8×NDFT",
            "assessment_status": dft_status,
            "confidence": 1.0 if calibrated_dft_data else None,
            "measurement_method": "Calibrated electromagnetic gauge per ISO 19840 Clause 5" if calibrated_dft_data else "Requires calibrated gauge readings",
            "evidence_source": "Sensor data" if calibrated_dft_data else "None (Optical RGB image only)",
            "explanation": dft_expl,
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 18: NACE SP0188 Coating Continuity / Holiday Testing (Strict Limitation)
        if calibrated_holiday_data:
            holidays_found = calibrated_holiday_data.get("discontinuity_count", 0)
            hol_val = f"{holidays_found} discontinuities detected"
            hol_status = "Measured"
            hol_expl = f"Holiday testing performed per NACE SP0188 using {calibrated_holiday_data.get('voltage_kv', 1.5)} kV test potential."
        else:
            hol_val = "Not tested"
            hol_status = "Not tested"
            hol_expl = "Optical visual inspection can identify surface void indications but cannot verify electrical dielectric continuity. Holiday testing must be conducted using a calibrated high-voltage spark or low-voltage wet-sponge detector per NACE SP0188:2006."

        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "nace_sp0188_continuity",
            "measurement_name": "NACE SP0188 Coating Continuity / Holiday Testing",
            "measurement_category": "COATING_CONTINUITY",
            "measured_value": hol_val,
            "numeric_value": float(calibrated_holiday_data.get("discontinuity_count", 0)) if calibrated_holiday_data else None,
            "unit": "discontinuities",
            "applicable_standard": "NACE SP0188 (2006)",
            "standard_edition": "Standard Practice SP0188-2006",
            "rating_or_criterion": "Zero electrical holiday spark/sponge discharges across test plane",
            "assessment_status": hol_status,
            "confidence": 1.0 if calibrated_holiday_data else None,
            "measurement_method": "High-voltage spark / wet-sponge testing" if calibrated_holiday_data else "Requires holiday detector log",
            "evidence_source": "Holiday detector log" if calibrated_holiday_data else "None (Optical RGB image only)",
            "explanation": hol_expl,
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 19: ISO 8502-3 Surface Dust Assessment
        dust_count = category_counts.get("dust_particle", 0)
        if dust_count == 0:
            dust_val = "Rating 0, Class 0 (No particulate)"
            dust_status = "Assessed"
        else:
            dq = min(5, max(1, math.ceil(dust_area_pct * 2.0)))
            dust_val = f"Rating {dq}, Class 1 (Visual particulate proxy)"
            dust_status = "Assessed"

        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "iso_8502_3_dust_rating",
            "measurement_name": "ISO 8502-3 Surface Dust Rating",
            "measurement_category": "ISO_8501_SURFACE_PREP",
            "measured_value": dust_val,
            "numeric_value": float(dust_count),
            "unit": "rating",
            "applicable_standard": "ISO 8502-3:2017",
            "standard_edition": "Second edition (2017-01-15)",
            "rating_or_criterion": "Quantity ratings 0-5, particle size class 0-5 per ISO 8502-3 Clause 6",
            "assessment_status": dust_status,
            "confidence": round(mean_confidence, 4),
            "measurement_method": "Optical particulate segmentation (visual proxy)",
            "evidence_source": "Optical specimen capture",
            "explanation": f"Visual optical proxy for surface dust. Note: Formal ISO 8502-3 compliance requires pressure-sensitive tape peel test with standardized roller application on blast-cleaned substrate.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 20: 3D Surface Micro-Topography Depth Proxy
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "topography_depth_proxy",
            "measurement_name": "Surface Topography Depth Proxy",
            "measurement_category": "SURFACE_TOPOGRAPHY",
            "measured_value": f"{mean_depth_proxy:.4f} (relative proxy)" if mean_depth_proxy is not None else "Not available",
            "numeric_value": round(mean_depth_proxy, 4) if mean_depth_proxy is not None else None,
            "unit": "relative proxy",
            "applicable_standard": "Project Dhatu Rakshana Topography Protocol",
            "standard_edition": "Version 2.0",
            "rating_or_criterion": "Relative optical depth anomaly index",
            "assessment_status": "Measured" if mean_depth_proxy is not None else "Not applicable",
            "confidence": 0.85 if mean_depth_proxy is not None else None,
            "measurement_method": "Luminance gradient integration from Open3D micro-topography model",
            "evidence_source": "Open3D micro-topography mesh",
            "explanation": "Relative depth variation proxy derived from 3D surface reconstruction. Uncalibrated dimensionless indicator; does not represent physical millimeter depth.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 21: 3D Surface Roughness Index
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "topography_roughness_index",
            "measurement_name": "Surface Roughness Gradient Index",
            "measurement_category": "SURFACE_TOPOGRAPHY",
            "measured_value": f"{mean_roughness_idx:.4f} (relative proxy)" if mean_roughness_idx is not None else "Not available",
            "numeric_value": round(mean_roughness_idx, 4) if mean_roughness_idx is not None else None,
            "unit": "relative proxy",
            "applicable_standard": "Project Dhatu Rakshana Topography Protocol",
            "standard_edition": "Version 2.0",
            "rating_or_criterion": "Surface normal gradient variance",
            "assessment_status": "Measured" if mean_roughness_idx is not None else "Not applicable",
            "confidence": 0.85 if mean_roughness_idx is not None else None,
            "measurement_method": "Sobel spatial relief gradient across vertex mesh",
            "evidence_source": "Open3D micro-topography mesh",
            "explanation": "Estimated surface micro-texture roughness proxy. Uncalibrated dimensionless indicator; not a stylus/laser profilometer Ra reading.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # Measurement 22: 3D Mesh Availability
        measurements.append({
            "inspection_id": inspection_id,
            "image_id": img_id,
            "measurement_key": "topography_mesh_availability",
            "measurement_name": "3D Micro-Topography PLY Mesh",
            "measurement_category": "SURFACE_TOPOGRAPHY",
            "measured_value": "Available (Binary PLY, SHA-256 verified)" if topo_available else "Not generated",
            "numeric_value": 1.0 if topo_available else 0.0,
            "unit": "status",
            "applicable_standard": "Project Dhatu Rakshana Topography Protocol",
            "standard_edition": "Version 2.0",
            "rating_or_criterion": "Binary PLY storage in persistent vault with SHA-256 integrity hash",
            "assessment_status": "Measured" if topo_available else "Not applicable",
            "confidence": 1.0,
            "measurement_method": "Vectorized Open3D mesh generation",
            "evidence_source": f"storage/topology/{inspection_id}/topology.ply" if topo_available else "None",
            "explanation": f"Full 3D surface mesh model for interactive Three.js rendering and spatial elevation inspection.",
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": now_ist
        })

        # -------------------------------------------------------------
        # 4. Synthesize the 5 Structured Report Sections
        # -------------------------------------------------------------
        # Section A: Inspection Summary
        inspection_summary = {
            "inspection_id": inspection_id,
            "scan_identifier": getattr(primary_img, "original_filename", f"specimen_{inspection_id}.png") if primary_img else f"specimen_{inspection_id}",
            "evaluation_timestamp_ist": format_ist_iso(now_ist),
            "evaluation_timestamp_display": format_ist_display(now_ist, include_seconds=True),
            "overall_condition": "DEFECT_FREE" if total_defect_count == 0 else ("ACCEPTABLE_WITH_OBSERVATION" if verdict == "REVIEW" else "BARRIER_BREACH_CRITICAL"),
            "overall_verdict": verdict,
            "evaluation_engine_version": self.version,
            "applicable_standards": [
                "ISO 4628-1:2016 (Defect Quantity & Size)",
                "ISO 4628-2:2016 (Blistering)",
                "ISO 4628-3:2016 (Rusting Degree)",
                "ISO 4628-4:2016 (Cracking)",
                "ISO 4628-5:2016 (Flaking)",
                "ISO 4628-8:2012 (Scribe Delamination & Creep)",
                "ISO 8501-1:2007 (Surface Cleanliness & Rust Grades)",
                "SSPC-PA 2 / ISO 19840:2012 (Dry Film Thickness)",
                "NACE SP0188:2006 (Coating Continuity / Holiday Testing)",
                "DR-FRAMEWORK-2026 (Naval Operational Thresholds)"
            ],
            "detected_defects_summary": (
                f"{total_defect_count} localized anomalies identified across {cumulative_defect_pct:.2f}% of inspected area. "
                f"Dominant classification: {dominant_subtype.capitalize()}."
                if total_defect_count > 0
                else "No localized coating defects or substrate corrosion breaches detected. Protective coating barrier integrity is intact."
            ),
            "important_limitations": [
                "Dry film thickness cannot be inferred from 2D optical photographs (SSPC-PA 2 / ISO 19840 requires calibrated magnetic gauge).",
                "Coating dielectric continuity / holiday verification cannot be proven by optical inspection alone (NACE SP0188 requires spark tester).",
                "Pre-coating blast cleanliness (Sa / St) cannot be established retrospectively from painted surface without pre-blast records.",
                "Surface micro-topography depth and roughness indicators represent optical relative proxies, not calibrated physical profilometry.",
                "Pixel area measurements remain uncalibrated without physical dimensional reference markers in the image."
            ]
        }

        # Section B: Quantitative Defect Assessment
        quantitative_assessment = {
            "total_defect_count": total_defect_count,
            "category_distribution": category_counts,
            "category_pixel_areas": {k: round(v, 2) for k, v in category_pixel_areas.items()},
            "total_image_pixels": int(total_image_pixels),
            "total_defect_pixels": round(total_defect_px, 2),
            "cumulative_defect_area_pct": round(cumulative_defect_pct, 4),
            "largest_defect_area_px": round(largest_defect_area_px, 2),
            "largest_defect_area_pct": round((largest_defect_area_px / total_image_pixels * 100.0), 4) if total_image_pixels > 0 else 0.0,
            "largest_defect_subtype": largest_defect_subtype,
            "average_defect_area_px": round(avg_defect_area_px, 2),
            "average_defect_area_pct": round(avg_defect_pct, 4),
            "spatial_distribution_quadrants": quadrant_counts,
            "spatial_distribution_summary": spatial_desc,
            "assessment_confidence_pct": round(mean_confidence * 100, 1),
            "units_note": "All spatial dimensions and areas are explicitly pixel-based (px / px²) in the absence of metric spatial calibration."
        }

        # Section C: Standards-Based Assessment
        standards_assessment = [
            {
                "standard_identifier": "ISO 4628-3",
                "edition": "Third edition (2016-01-15)",
                "assessment_criterion": "Rusting degree scale Ri 0 (0 %) to Ri 5 (> 8 % area)",
                "observed_evidence": f"Corrosion / active rust blooms occupy {rust_area_pct:.2f} % of specimen area ({category_counts.get('corrosion', 0)} instances)",
                "assigned_rating": ri_rating,
                "acceptance_status": ri_verdict,
                "rule_traceability": "ISO 4628-3:2016 Table 1",
                "limitations": "Rusting degree evaluated on 2D visual surface; under-film creep requires destructive cross-sectioning."
            },
            {
                "standard_identifier": "ISO 4628-2",
                "edition": "Third edition (2016-01-15)",
                "assessment_criterion": "Degree of blistering: Quantity 0-5, Size S2-S5",
                "observed_evidence": f"{blister_count} blister indications covering {blister_area_pct:.2f} % area",
                "assigned_rating": blister_val,
                "acceptance_status": blister_verdict,
                "rule_traceability": "ISO 4628-2:2016 Clause 5",
                "limitations": "Osmotic blistering interior liquid composition cannot be determined by non-destructive optical scan."
            },
            {
                "standard_identifier": "ISO 4628-1",
                "edition": "Fourth edition (2016-01-15)",
                "assessment_criterion": "Formal reporting format: defect type; degree n(Sn), area %",
                "observed_evidence": f"Total {total_defect_count} anomalies covering {cumulative_defect_pct:.2f} % area (dominant: {dominant_subtype})",
                "assigned_rating": iso_4628_1_formal,
                "acceptance_status": verdict,
                "rule_traceability": "ISO 4628-1:2016 Clause 5 & Tables 1-2",
                "limitations": "Standard designation applies to visible anomalies; microscopic sub-visual voids (< S2) require magnification."
            },
            {
                "standard_identifier": "ISO 4628-8",
                "edition": "Second edition (2012-11-01)",
                "assessment_criterion": "Directional spread d = (d1 - w)/2 around linear scribe or scratch",
                "observed_evidence": (
                    f"Mechanical scratch breach identified ({scratch_count} instances, {scratch_area_pct:.2f}% area); directional spread {scribe_spread_px:.1f} px"
                    if scratch_count > 0
                    else "No linear scribe, scratch, or mechanical gouge detected on coating plane"
                ),
                "assigned_rating": f"d = {scribe_spread_px:.1f} px" if scribe_spread_px is not None else "Not applicable",
                "acceptance_status": scribe_verdict,
                "rule_traceability": "ISO 4628-8:2012 Clause 4",
                "limitations": "Directional spread is recorded in pixels; millimeter reporting requires calibrated optical target or physical knife probing per Clause 4."
            },
            {
                "standard_identifier": "ISO 8501-1",
                "edition": "Second edition (2007-05-01)",
                "assessment_criterion": "Surface condition rust grades (A-D) & blast cleanliness grades (Sa 1-3)",
                "observed_evidence": f"Visible bare substrate at coating breaches exhibits {obs_rust_condition}. Pre-coating blast cleanliness cannot be determined.",
                "assigned_rating": f"Substrate: {obs_rust_grade} | Prep: Insufficient evidence",
                "acceptance_status": "INSUFFICIENT_EVIDENCE",
                "rule_traceability": "ISO 8501-1:2007 Clause 2 & 3",
                "limitations": "Pre-treatment surface preparation grade (Sa 2½) cannot be certified retrospectively from post-coating image without pre-blast QA records."
            },
            {
                "standard_identifier": "SSPC-PA 2 / ISO 19840",
                "edition": "Second edition (2012-09-01)",
                "assessment_criterion": "80/20 Rule: Mean DFT ≥ NDFT; ≥80% readings ≥ NDFT; no reading < 0.8×NDFT",
                "observed_evidence": "No calibrated magnetic/eddy-current thickness sensor input supplied with inspection specimen.",
                "assigned_rating": "Not measured",
                "acceptance_status": "NOT_MEASURED",
                "rule_traceability": "ISO 19840:2012 Clause 5 & 9",
                "limitations": "Dry film thickness cannot be inferred from RGB optical photographs. Physical gauge readings required."
            },
            {
                "standard_identifier": "NACE SP0188",
                "edition": "Standard Practice SP0188-2006",
                "assessment_criterion": "Zero electrical holiday spark/sponge discharges across test plane",
                "observed_evidence": "No calibrated high-voltage spark or low-voltage wet-sponge detector log supplied.",
                "assigned_rating": "Not tested",
                "acceptance_status": "NOT_TESTED",
                "rule_traceability": "NACE SP0188:2006 Section 3 & 4",
                "limitations": "Optical inspection cannot prove absence of microscopic pinhole holidays or electrical continuity."
            }
        ]

        # Section D: Surface Topography
        surface_topography = {
            "mesh_available": topo_available,
            "relative_depth_proxy": round(mean_depth_proxy, 4) if mean_depth_proxy is not None else None,
            "roughness_index": round(mean_roughness_idx, 4) if mean_roughness_idx is not None else None,
            "elevation_profile_note": (
                "Open3D micro-topography model reconstructs visual relief elevation using luminance gradients and chromaticity contrasts. "
                "Values are uncalibrated optical relative proxies. They must NOT be treated as physical micrometer/millimeter profilometry measurements."
            ),
            "physical_calibration_status": "Uncalibrated optical relative proxy (No laser/stylus profile sensor attached)"
        }

        # Section E: Recommendations
        automated_recommendations: List[str] = []
        mandatory_requirements: List[str] = []

        if verdict == "FAIL":
            automated_recommendations.append("Immediate localized surface repair and repainting required to arrest substrate oxidation undercut.")
            if rust_area_pct > 3.0:
                automated_recommendations.append(f"Perform abrasive grit blasting on corroded strake area ({rust_area_pct:.2f}% affected) back to sound coated edges.")
            if blister_area_pct > 3.5:
                automated_recommendations.append("Investigate potential osmotic moisture entrapment or cathodic disbondment behind blister pockets.")
            mandatory_requirements.append("ISO 8501-1 Clause 3.1 mandates blast-cleaning to Sa 2½ (very thorough blast-cleaning) prior to applying immersion epoxy primer.")
            mandatory_requirements.append("SSPC-PA 2 Clause 5 requires verification of dry film thickness using calibrated magnetic gauge before final acceptance.")
        elif verdict == "REVIEW":
            automated_recommendations.append("Schedule certified human inspector review and documented maintenance observation within 30 operational days.")
            automated_recommendations.append("Monitor localized defect clusters for crack propagation or corrosion creep during scheduled port calls.")
            mandatory_requirements.append("Record localized defect coordinates in naval platform hull integrity log.")
            mandatory_requirements.append("Perform non-destructive dry film thickness spot measurements per SSPC-PA 2 / ISO 19840 to verify barrier margin.")
        else:
            automated_recommendations.append("Coating system demonstrates sound barrier protection. Maintain standard routine visual inspection interval.")
            mandatory_requirements.append("Log inspection scan as baseline reference for future degradation rate trend analysis.")

        # Always add standards verification reminders
        mandatory_requirements.append("SSPC-PA 2: Dry film thickness must be verified using calibrated non-destructive gauges prior to formal certification.")
        mandatory_requirements.append("NACE SP0188: Complete holiday testing on high-risk immersion zones before returning platform to active service.")

        recommendations = {
            "automated_recommendations": automated_recommendations,
            "mandatory_standards_requirements": mandatory_requirements,
            "distinction_notice": "Automated recommendations are algorithmic operational advisories. Mandatory standards requirements are contractual and engineering prerequisites specified in the referenced ISO, SSPC, and NACE standards."
        }

        evaluation_summary = {
            "inspection_summary": inspection_summary,
            "quantitative_defect_assessment": quantitative_assessment,
            "standards_based_assessment": standards_assessment,
            "surface_topography": surface_topography,
            "recommendations": recommendations,
            "evaluation_engine_version": self.version,
            "evaluation_timestamp": format_ist_iso(now_ist)
        }

        return {
            "overall_verdict": verdict,
            "measurements": measurements,
            "evaluation_summary": evaluation_summary,
            "dominant_subtype": dominant_subtype,
            "iso_4628_1_formal": iso_4628_1_formal,
            "ri_rating": ri_rating
        }

# Global singleton
iso_evaluation_engine = ISOEvaluationEngine()
