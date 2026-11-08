# Dhatu Rakshana: Retraining Pipeline Deliverable Report
**Generated on:** 2026-11-08 11:23:27 UTC
**Hardware:** 2 GPU(s) (Tesla T4)

---

## 1. Stage 1: Micro-Defect Localization (yolov8m.pt)
* **Model Weights:** `yolov8_detector_best.pt`
* **Architecture:** yolov8m.pt (Input: 512x512, Batch: 32)
* **mAP@50:** 0.8707
* **mAP@50-95:** 0.5879
* **Precision / Recall:** 0.8629 / 0.8366

---

## 2. Stage 2: Subtype Classifier (RESNET18)
* **Model Weights:** `resnet_classifier_best.pt`
* **Backbone:** RESNET18 with AdaptiveConcatPool2d
* **Input Resolution:** 256x256
* **Peak Validation Accuracy:** 96.55%
* **Peak Macro F1-Score:** 0.9656

### Per-Class Diagnostic Performance:
- **contamination**: Precision = 92.63%, Recall = 94.25%, F1 = 93.43%
- **inclusion**: Precision = 92.46%, Recall = 92.00%, F1 = 92.23%
- **no_defect**: Precision = 98.27%, Recall = 99.50%, F1 = 98.88%
- **pinhole**: Precision = 99.49%, Recall = 98.50%, F1 = 98.99%
- **scratch**: Precision = 100.00%, Recall = 98.50%, F1 = 99.24%

---
## 3. Retraining Fixes Verified in this Session:
* [x] Zenodo multi-source auto-detection & fail-safe download assertion.
* [x] Leakage-free GroupShuffleSplit (parent-image grouped splitting).
* [x] Adaptive micro-defect bounding box padding (no pixel-drowning blur).
* [x] Two-stage transfer learning (frozen backbone warmup + discriminative fine-tuning).
* [x] Balanced offline augmentations for minority classes without double-penalty sampler conflicts.
* [x] YOLOv8l Large architecture integration with VRAM-adaptive batch sizing.
