# Sample Marine Inspection & 3D Topography Dataset

## Overview & Purpose
This directory provides ready-to-use sample inspection input images and reconstructed 3D surface micro-topography meshes (`.ply` format). It is designed to assist developers, QA engineers, and system evaluators with:
- Manual testing of the inspection upload workflow in the React Web Dashboard.
- Testing and visualization of the Three.js 3D Micro-Topography Viewer.
- Standalone pipeline demonstration without requiring live hardware cameras or manual specimen creation.

> **Data Classification**:
> These files are **synthetic/sample inspection assets** created for system demonstration and testing. They are not real-world classified naval platform inspection records.

## Provenance
* **Source**: Restored and derived from `prototype/backend` assets.
* **3D Reconstruction**: Generated via the integrated Open3D surface micro-topography reconstruction engine using depth relief gradients.

## Contents

### 1. Specimen Images (`images/`)
* `sample_pinhole_specimen.png` — Specimen showing pinhole / holiday defect.
* `sample_scratch_specimen.png` — Specimen exhibiting jagged mechanical surface scratch.
* `sample_contamination_specimen.png` — Specimen showing localized marine salt/oil contamination.

### 2. 3D Surface Topography Meshes (`topology/`)
* `sample_surface_mesh.ply` — Open3D binary PLY triangle mesh (48,400 vertices, 95,922 triangles) containing vertex coordinates, surface normals, and RGB vertex color mapping representing elevation differences.
* `demo_surface_mesh.ply` — Compatible alias of the sample surface mesh matching legacy prototype naming.

## Compatibility & Usage
* **Three.js Viewer**: Drag and drop or upload via the web dashboard at `http://localhost:8000`.
* **Open3D / MeshLab**: Directly viewable using Open3D (`open3d.io.read_triangle_mesh(...)`) or external 3D viewers (MeshLab, Blender).
