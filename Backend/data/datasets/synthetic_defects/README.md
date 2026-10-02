# Synthetic Marine Platform Coating Defect Dataset

## Overview & Purpose
This dataset contains procedurally generated synthetic marine coating defect images, bounding-box annotations in YOLOv8 format, and metadata records. It is intended for **manual development, demonstration, ML model experimentation, benchmarking, and end-to-end application testing**.

> **Note on Data Provenance**:
> This dataset contains **purely synthetic procedural images** and is **not real-world operational inspection data**. Do not cite or use as authentic maritime naval fleet inspection records.

## Provenance
* **Source**: Restored from `prototype/backend` (procedural generator: `ml/generate_sample_data.py`).
* **Generation Engine**: Procedural hull texture synthesis with layered salt noise, weld seams, and procedural defect overlays (pinholes, mechanical gouges/scratches, inclusions, contamination stains, and dust particle clusters).

## Dataset Specifications
* **Sample Count**: 12 synthetic specimens
* **Image Format**: PNG (640 × 640 pixels, 24-bit RGB)
* **Annotation Format**: YOLOv8 text format (`<class_id> <x_center> <y_center> <width> <height>` normalized to `[0.0, 1.0]`)
* **Metadata Index**: `metadata.csv` (contains `filename`, `class`, `subtype`, `area_pct`, `expected_verdict`)

## Defect Classes & Categories

| Class ID | Class Label | Subtypes / Defect Categories | Description |
| :--- | :--- | :--- | :--- |
| `0` | `defect` | `pinhole` | Localized dark pits / coating holidays with light halo boundaries |
| `0` | `defect` | `scratch` | Jagged mechanical gouges / scratches exposing underlying steel or primer |
| `0` | `defect` | `inclusion` | Embedded slag, blisters, or foreign particulate inclusions |
| `0` | `defect` | `contamination`| Translucent fluid, chemical residue, or marine salt contamination stains |
| `1` | `particle` | `dust_particle`| Small clusters of high-reflectance blast dust or surface particles |
| N/A | `clean` | `no_defect` | Uniformly painted hull plates with micro-roughness but zero defects (empty label) |

## Directory Structure
```text
synthetic_defects/
├── images/                   # 12 synthetic scan PNG images (640x640)
│   ├── marine_scan_001_pinhole.png
│   ├── marine_scan_002_scratch.png
│   └── ...
├── labels/                   # 12 YOLOv8 normalized annotation text files
│   ├── marine_scan_001_pinhole.txt
│   ├── marine_scan_002_scratch.txt
│   └── ...
├── classes.txt               # Class label mappings
├── data.yaml                 # YOLO training/validation dataset configuration
├── metadata.csv              # Specimen metadata and expected audit verdicts
└── README.md                 # Dataset documentation (this file)
```

## Intended Use
* Development of defect segmentation and bounding-box detection algorithms.
* Verification of standards compliance grading (SSPC-PA 2, NACE SP0188, ISO 4628).
* Functional and UI demonstration of the Dhatu Rakshana dashboard and inspection workflows.
