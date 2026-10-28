# Dhatu Rakshana (धातु रक्षण)
### AI-Powered Defense Marine Platform Coating Inspection, 3D Micro-Topography Reconstruction & ISO Compliance Grading

[![Python 3.11](https://img.shields.io/badge/Python-3.11.x-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19.0.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.5.1-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Ultralytics YOLOv8](https://img.shields.io/badge/Ultralytics-YOLOv8-blue)](https://docs.ultralytics.com/)
[![Open3D](https://img.shields.io/badge/Open3D-0.18.0-darkgreen)](http://www.open3d.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Production_Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

---

## 1. Overview & Operational Mission

Marine protective coatings are the first line of defense against severe seawater galvanic corrosion, biofouling, and structural mechanical degradation on naval platforms (vessel hulls, ballast tanks, splash zones, and deck superstructures). Microscopic defects—such as **pinholes**, **micro-scratches**, **chemical contamination**, and **particulate inclusions**—frequently go unnoticed during manual human visual audits until catastrophic substrate oxidation occurs.

**Dhatu Rakshana (धातु रक्षण)** is an end-to-end, automated marine coating inspection and structural integrity evaluation platform. It ingests ultra-high-resolution raw specimen scans (up to $20\text{MP}$, $5472 \times 3648$) without downsampling, performs high-precision multi-stage AI detection, calculates quantitative geometric and photometric depth metrics, constructs interactive 3D surface micro-topography meshes, and certifies compliance against international maritime engineering standards (**ISO 4628**, **SSPC-PA 2**, and **AMPP/NACE**).

---

## 2. End-to-End 7-Stage Inspection Architecture

```
[ Naval Platform Specimen Scans (20MP Raw Photos) ]
                        │
                        ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │  Stage 1: Validation & EXIF Preprocessing                        │
 │  • Dimension checks, color space normalization, aspect ratio.    │
 └──────────────────────┬───────────────────────────────────────────┘
                        │
                        ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │  Stage 2: High-Resolution 2-Stage Tiled AI Inference             │
 │  • Overlapping 640x640 sliding window slicing (Zero downsample). │
 │  • YOLOv8 primary detector + ResNet18 fine-grained classifier.   │
 │  • Subtypes: pinhole, scratch, inclusion, contamination.        │
 └──────────────────────┬───────────────────────────────────────────┘
                        │
                        ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │  Stage 3: Morphological Boundary Refinement (OpenCV)             │
 │  • Adaptive Otsu thresholding, contour perimeter tracing.        │
 └──────────────────────┬───────────────────────────────────────────┘
                        │
                        ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │  Stage 4: Quantitative Engineering Measurements                  │
 │  • Defect area %, centroid coordinates, equivalent diameter,     │
 │    aspect ratio, and photometric depth proxy estimation.         │
 └──────────────────────┬───────────────────────────────────────────┘
                        │
                        ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │  Stage 5: 3D Surface Micro-Topography Reconstruction (Open3D)    │
 │  • Generates true-scale 3D .ply surface meshes.                  │
 │  • Interactive Three.js OrbitControls rendering in web browser.  │
 └──────────────────────┬───────────────────────────────────────────┘
                        │
                        ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │  Stage 6: Maritime Standards Compliance Engine                   │
 │  • Evaluates ISO 4628 density rating (0 to 5) & severity.        │
 │  • Evaluates SSPC-PA 2 dry film thickness criteria.              │
 │  • Automated engineering verdict: PASS / REVIEW / FAIL.          │
 └──────────────────────┬───────────────────────────────────────────┘
                        │
                        ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │  Stage 7: Authoritative Audit PDF Generation (ReportLab)         │
 │  • Generates signed defense audit report with defect crops,      │
 │    quantitative tables, and digital inspector sign-off.          │
 └──────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Backend & AI Processing Engine
- **Framework:** FastAPI 0.115.6 with Uvicorn 0.34.0 (Async REST API)
- **Deep Learning:** PyTorch 2.5.1, TorchVision 0.20.1, Ultralytics YOLOv8 8.3.50
- **Computer Vision:** OpenCV Headless 4.10.0.84, NumPy 1.26.4, Scikit-Learn 1.5.2
- **3D Reconstruction:** Open3D 0.18.0
- **Database & ORM:** PostgreSQL 16 / SQLite via SQLModel 0.0.22 and Alembic 1.14.1 migrations
- **Reporting:** ReportLab 4.2.5

### Frontend Web Dashboard
- **Framework:** React 19 with Vite 8.3.5
- **Styling:** Tailwind CSS 3.4.17 (Technical dark theme)
- **3D Visualization:** Three.js with OrbitControls & PLYLoader
- **Charting & Analytics:** Recharts 2.15.1
- **Icons:** Lucide React

---

## 4. Quick Start: Local Execution

### Prerequisites
- Python 3.11.x
- Node.js 20+ (for frontend development)

### 1. Launch with Single Script
From the repository root:
```bash
python run_project.py
```
This starts the backend API and serves the compiled React single-page application unified on `http://localhost:8000/`.

### 2. Access the Platform
* **Web User Interface:** [http://localhost:8000/](http://localhost:8000/)
* **Interactive API Documentation (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Default Inspector Credentials:**
  * **Email:** `inspector@navy.mil`
  * **Password:** `password123`

---

## 5. Cloud & Production Deployment (Docker Compose)

The platform includes a containerized multi-container setup with PostgreSQL, FastAPI, and Nginx.

```bash
# 1. Copy the production environment configuration
cp .env.docker .env

# 2. Launch the full production stack in detached mode
docker compose --env-file .env up --build -d

# 3. Verify container health
docker compose ps
```

* **Production Port:** `http://<server-ip>/` (Port 80 via Nginx)
* **Direct Backend Port:** `http://<server-ip>:8000/`
* For detailed cloud instructions, refer to [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 6. Project Structure

```text
Dhatu_Rakshana/
├── Backend/                     # FastAPI backend application
│   ├── app/
│   │   ├── api/v1/              # API routers (/auth, /inspections, /zones, /models, /artifacts)
│   │   ├── core/                # Configuration, security, logging
│   │   ├── db/                  # Session, migrations, reference seed data
│   │   ├── ml/                  # Model registry & 2-stage inference runner
│   │   ├── models/              # SQLModel database entity schemas
│   │   ├── reports/             # ReportLab PDF report generation
│   │   ├── standards/           # ISO 4628 & SSPC-PA 2 evaluation engine
│   │   ├── storage/             # Partitioned object storage adapter
│   │   ├── vision/              # Morphological measurements & Open3D 3D meshing
│   │   └── workers/             # Multi-stage inspection worker
│   ├── config/                  # model_config.yaml, grading_thresholds.yaml
│   └── requirements.txt         # Pinned backend dependencies
├── Frontend/                    # React 19 technical SPA
│   ├── src/
│   │   ├── components/          # BoundingBoxOverlay, 3D MeshViewer, Dropzone, Badges
│   │   ├── pages/               # HomePage, Upload, Result, History, IsoRulebase, VisitorAccess
│   │   └── api/                 # Dynamic base URL resolution & API client
│   └── dist/                    # Production built static bundle
├── models/                      # Pre-trained deep learning weights
│   ├── yolo_detector.pt         # YOLOv8 defect detector (49.6 MB)
│   └── resnet_classifier.pt     # ResNet18 fine-grained classifier (42.7 MB)
├── nginx/                       # Nginx reverse proxy configuration
│   └── nginx.conf
├── docker-compose.yml           # Production Docker Compose orchestration
├── Dockerfile                   # Multi-stage frontend/backend Dockerfile
├── run_project.py               # Single-command local launcher
├── DEPLOYMENT.md                # Cloud and remote server deployment manual
└── Setup.md                     # Development environment setup instructions
```

---

## 7. License & Compliance
Designed and engineered for Naval Platform Structural Coating Inspection & Defense Maritime Asset Longevity. Certified compliant with ISO 4628 and SSPC-PA 2 coating assessment criteria.
