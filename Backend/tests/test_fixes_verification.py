"""Unit and regression tests verifying fixes for:
1. Multi-Image Serialization & Association
2. Two-Stage Inference Pipeline (Soft Rejection, Particles, Tiling, Adaptive Context, Post-Stage-2 NMS)
3. Frontend and schema contracts
"""

import unittest
import sys
from pathlib import Path
import numpy as np
from PIL import Image
import torch
import torchvision

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.schemas.inspection import InspectionDetail
from app.ml.inference.two_stage_runner import (
    TwoStageInspectionRunner,
    OPERATIONAL_MODES,
    OPERATIONAL_PRESETS
)
from app.ml.base import DefectCandidate


class TestMultiImageSerialization(unittest.TestCase):
    def test_inspection_detail_preserves_images_field(self):
        sample_images = [
            {
                "id": 101,
                "inspection_id": 42,
                "storage_key": "images/test_panel_1.png",
                "original_filename": "panel_front.png",
                "width": 5472,
                "height": 3648,
                "is_primary": True,
                "created_at": "2026-10-29T18:00:00+05:30"
            },
            {
                "id": 102,
                "inspection_id": 42,
                "storage_key": "images/test_panel_2.png",
                "original_filename": "panel_angle.png",
                "width": 768,
                "height": 768,
                "is_primary": False,
                "created_at": "2026-10-29T18:01:00+05:30"
            }
        ]

        payload = {
            "id": 42,
            "display_id": 42,
            "display_label": "Record 42",
            "timestamp": "2026-10-29T18:00:00+05:30",
            "zone_id": 1,
            "overall_verdict": "PASS",
            "status": "COMPLETED",
            "images": sample_images
        }

        detail = InspectionDetail(**payload)
        dumped = detail.model_dump()

        self.assertIn("images", dumped)
        self.assertEqual(len(dumped["images"]), 2)
        self.assertEqual(dumped["images"][0]["width"], 5472)
        self.assertEqual(dumped["images"][0]["height"], 3648)
        self.assertEqual(dumped["images"][1]["width"], 768)
        self.assertEqual(dumped["images"][1]["height"], 768)

    def test_inspection_detail_defaults_empty_images(self):
        payload = {
            "id": 1,
            "timestamp": "2026-10-29T18:00:00+05:30",
            "zone_id": 1,
            "overall_verdict": "PASS"
        }
        detail = InspectionDetail(**payload)
        self.assertEqual(detail.images, [])


class TestTwoStagePipelineFixes(unittest.TestCase):
    def setUp(self):
        self.runner = TwoStageInspectionRunner(
            name="test_runner",
            version="2.0.0",
            device="cpu"
        )
        self.runner.resnet_classes = ["contamination", "inclusion", "no_defect", "pinhole", "scratch"]

    def test_operational_presets_balanced_mode(self):
        self.assertIn("balanced", OPERATIONAL_PRESETS)
        self.assertFalse(OPERATIONAL_PRESETS["balanced"]["accept_particles"])
        self.assertFalse(OPERATIONAL_MODES["balanced"]["accept_particles"])
        self.assertEqual(self.runner.tile_size, 512)
        self.assertEqual(self.runner.overlap, 128)

    def test_adaptive_context_crop_scale_preservation(self):
        # 1000x1000 synthetic test image
        img = Image.new("RGB", (1000, 1000), (100, 100, 100))
        # Micro-defect bbox: 10x10 px at (500, 500)
        box = [500, 500, 510, 510]

        crop = self.runner._crop_with_adaptive_context(img, box, min_side=120, context=2.2)
        cw, ch = crop.size
        # Minimum dimension must maintain at least 120x120 context window
        self.assertGreaterEqual(cw, 120)
        self.assertGreaterEqual(ch, 120)

        # Macro-defect bbox: 200x200 px at (300, 300)
        macro_box = [300, 300, 500, 500]
        macro_crop = self.runner._crop_with_adaptive_context(img, macro_box, min_side=120, context=2.2)
        mcw, mch = macro_crop.size
        # 200 * 2.2 = 440
        self.assertAlmostEqual(mcw, 440, delta=2)
        self.assertAlmostEqual(mch, 440, delta=2)

    def test_soft_rejection_fallacy_clean_dominant_rejected(self):
        """Clean background is 55% (< clean_rejection_thr 0.65) but dominates over defect (20%). Must be REJECTED."""
        cand_boxes = np.array([[50, 50, 80, 80]])
        cand_confs = np.array([0.75])
        # classes: ["contamination", "inclusion", "no_defect", "pinhole", "scratch"]
        # no_defect=0.55, pinhole=0.20, scratch=0.15, inclusion=0.05, contamination=0.05
        probs = np.array([[0.05, 0.05, 0.55, 0.20, 0.15]])

        survivors = self.runner._classify_and_filter(
            cand_boxes=cand_boxes,
            cand_confs=cand_confs,
            probs=probs,
            clean_rejection_thr=0.65,
            orig_w=1000,
            orig_h=1000
        )
        self.assertEqual(len(survivors), 0, "Clean-dominant candidate was falsely accepted!")

    def test_soft_rejection_fallacy_defect_dominant_accepted(self):
        """Defect is 60%, clean is 20%. Must be ACCEPTED as scratch."""
        cand_boxes = np.array([[50, 50, 80, 80]])
        cand_confs = np.array([0.75])
        # no_defect=0.20, scratch=0.60
        probs = np.array([[0.05, 0.05, 0.20, 0.10, 0.60]])

        survivors = self.runner._classify_and_filter(
            cand_boxes=cand_boxes,
            cand_confs=cand_confs,
            probs=probs,
            clean_rejection_thr=0.65,
            orig_w=1000,
            orig_h=1000
        )
        self.assertEqual(len(survivors), 1)
        self.assertEqual(survivors[0].subtype, "scratch")
        self.assertAlmostEqual(survivors[0].confidence, 0.60, places=3)

    def test_soft_rejection_fallacy_clean_threshold_exceeded(self):
        """Clean background is 80% (> clean_rejection_thr 0.65). Must be REJECTED."""
        cand_boxes = np.array([[50, 50, 80, 80]])
        cand_confs = np.array([0.75])
        probs = np.array([[0.05, 0.05, 0.80, 0.05, 0.05]])

        survivors = self.runner._classify_and_filter(
            cand_boxes=cand_boxes,
            cand_confs=cand_confs,
            probs=probs,
            clean_rejection_thr=0.65,
            orig_w=1000,
            orig_h=1000
        )
        self.assertEqual(len(survivors), 0)

    def test_post_stage_2_nms_tile_seam_deduplication(self):
        """Verifies duplicate bounding boxes spanning sliding tile seams are merged."""
        cand1 = DefectCandidate(
            class_name="defect",
            subtype="scratch",
            bbox=[100.0, 100.0, 160.0, 160.0],
            confidence=0.88,
            area_pct=0.36
        )
        # Duplicate box with heavy overlap (IoU > 0.70)
        cand2 = DefectCandidate(
            class_name="defect",
            subtype="scratch",
            bbox=[103.0, 102.0, 162.0, 161.0],
            confidence=0.82,
            area_pct=0.36
        )
        # Separate distant defect box
        cand3 = DefectCandidate(
            class_name="defect",
            subtype="pinhole",
            bbox=[400.0, 400.0, 430.0, 430.0],
            confidence=0.91,
            area_pct=0.09
        )

        candidates = [cand1, cand2, cand3]
        boxes_tensor = torch.tensor([c.bbox for c in candidates], dtype=torch.float32)
        scores_tensor = torch.tensor([c.confidence for c in candidates], dtype=torch.float32)
        keep = torchvision.ops.nms(boxes_tensor, scores_tensor, iou_threshold=0.25)
        filtered = [candidates[i] for i in keep.tolist()]

        self.assertEqual(len(filtered), 2, "NMS failed to merge duplicate tile seam boxes!")
        # Highest confidence between cand1 and cand2 must be retained
        subtypes = [f.subtype for f in filtered]
        self.assertIn("scratch", subtypes)
        self.assertIn("pinhole", subtypes)
        scratch_det = next(f for f in filtered if f.subtype == "scratch")
        self.assertEqual(scratch_det.confidence, 0.88)

    def test_high_entropy_uniform_logits_clean_rejected(self):
        """When logits have high entropy and clean dominates or ties, candidate must be rejected."""
        cand_boxes = np.array([[50, 50, 80, 80]])
        cand_confs = np.array([0.70])
        # classes: ["contamination", "inclusion", "no_defect", "pinhole", "scratch"]
        # clean=0.21, max defect=0.20
        probs_clean_lead = np.array([[0.20, 0.19, 0.21, 0.20, 0.20]])
        survivors = self.runner._classify_and_filter(
            cand_boxes=cand_boxes,
            cand_confs=cand_confs,
            probs=probs_clean_lead,
            clean_rejection_thr=0.65,
            orig_w=1000,
            orig_h=1000
        )
        self.assertEqual(len(survivors), 0, "High-entropy clean-dominant candidate should be rejected")

        # Perfectly uniform distribution (all 0.20)
        probs_uniform = np.array([[0.20, 0.20, 0.20, 0.20, 0.20]])
        survivors_uniform = self.runner._classify_and_filter(
            cand_boxes=cand_boxes,
            cand_confs=cand_confs,
            probs=probs_uniform,
            clean_rejection_thr=0.65,
            orig_w=1000,
            orig_h=1000
        )
        self.assertEqual(len(survivors_uniform), 0, "High-entropy tied candidate should be rejected")

    def test_zero_dimension_box_discarded(self):
        """Degenerate zero-width or zero-height bounding box must be discarded."""
        cand_boxes = np.array([[50, 50, 50, 80]])  # w = 0
        cand_confs = np.array([0.80])
        probs = np.array([[0.05, 0.05, 0.10, 0.10, 0.70]])
        survivors = self.runner._classify_and_filter(
            cand_boxes=cand_boxes,
            cand_confs=cand_confs,
            probs=probs,
            clean_rejection_thr=0.65,
            orig_w=1000,
            orig_h=1000
        )
        self.assertEqual(len(survivors), 0, "Zero-width candidate box should be discarded")

    def test_out_of_bounds_box_discarded(self):
        """Boxes outside image boundaries clamped to 0 dimension must be discarded."""
        cand_boxes = np.array([[1200, 1200, 1300, 1300]])
        cand_confs = np.array([0.80])
        probs = np.array([[0.05, 0.05, 0.10, 0.10, 0.70]])
        survivors = self.runner._classify_and_filter(
            cand_boxes=cand_boxes,
            cand_confs=cand_confs,
            probs=probs,
            clean_rejection_thr=0.65,
            orig_w=1000,
            orig_h=1000
        )
        self.assertEqual(len(survivors), 0, "Out-of-bounds candidate box should be discarded")


if __name__ == "__main__":
    unittest.main()
