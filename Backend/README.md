# Dhatu Rakshana (धातु रक्षण) — Production Backend

AI-powered Marine Platform Coating Defect Inspection, 3D Micro-Topography Surface Reconstruction, and AMPP/NACE/SSPC/ISO Compliance Grading Platform.

---

## 1. System Architecture

```text
Frontend (React 19 / Three.js)
        │
        ▼ HTTP REST / Multipart
FastAPI Backend (/api/v1 & compatibility routes)
        │
        ├── Auth / RBAC (Signed JWT, Argon2/Bcrypt)
        ├── Zone Management
        ├── Inspection Orchestrator & Storage
        │
        ▼
Inspection Processing Engine
        │
        ├── 1. Validation & Preprocessing (EXIF, Normalization)
        ├── 2. ML Inference (Model Registry -> YOLOv8 / Classical CV)
        ├── 3. OpenCV Morphology & Boundary Refinement
        ├── 4. Quantitative Measurements (Aspect ratio, Area %, Centroid, Depth proxy)
        ├── 5. Open3D 3D Micro-Topography (.ply mesh generation)
        ├── 6. Standards Grading Engine (AMPP, SSPC-PA 2, ISO 4628, ISO 8501)
        ├── 7. ReportLab PDF Audit Report Generation
        │
        ▼
Persistence & Storage
        ├── SQLite 3 (SQLModel + Alembic migrations) [Self-contained local data/dhatu_rakshana.db]
        └── S3-Style Partitioned Local Object Storage (SHA-256 integrity, safe keys)
```

---

## 2. Technology Stack

- **Python**: 3.11.x
- **API Framework**: FastAPI 0.115.6 / Uvicorn 0.34.0
- **Validation**: Pydantic 2.10.5
- **ORM & Database**: SQLModel 0.0.22 / SQLite 3 (Optional production PostgreSQL)
- **Migrations**: Alembic 1.14.1
- **Machine Learning & Deep Learning**: PyTorch 2.5.1, TorchVision 0.20.1, Ultralytics 8.3.50 (YOLOv8)
- **Computer Vision**: OpenCV Headless 4.10.0.84, NumPy 1.26.4, Pillow 10.4.0, Scikit-Learn 1.5.2
- **3D Micro-Topography**: Open3D 0.18.0
- **Reporting**: ReportLab 4.2.5

---

## 3. Directory Layout

```text
Backend/
├── app/
│   ├── main.py                  # FastAPI entrypoint & route assembly
│   ├── api/                     # API routers (v1 canonical & root compatibility)
│   │   ├── deps.py              # Dependencies (Auth, DB session)
│   │   └── v1/
│   │       ├── auth.py          # /auth/login, /auth/register, /auth/me
│   │       ├── inspections.py   # /inspections (Upload, list, detail, report)
│   │       ├── zones.py         # /zones (List, create, zone defect history)
│   │       ├── models.py        # /models (Model registry status)
│   │       ├── artifacts.py     # /artifacts/{id}/download
│   │       └── health.py        # /health, /ready
│   ├── core/                    # Config, security, logging, exceptions
│   ├── db/                      # Session, Alembic integration, seeding
│   ├── models/                  # 11 SQLModel relational entities
│   ├── schemas/                 # Pydantic request/response schemas
│   ├── repositories/            # Layered database repositories
│   ├── services/                # Business services (Inspection, Auth)
│   ├── ml/                      # Model registry, inference engines, preprocess, postprocess
│   ├── vision/                  # Measurements & Open3D 3D reconstruction
│   ├── standards/               # Config-driven grading engine
│   ├── reports/                 # ReportLab PDF report generator
│   ├── workers/                 # Inspection pipeline task worker
│   └── storage/                 # Local/S3 storage abstraction
├── alembic/                     # Database migrations
├── config/                      # grading_thresholds.yaml, model_config.yaml
├── scripts/                     # benchmark.py, train.py, evaluate.py
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

---

## 4. Getting Started

### 4.1 Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 4.2 Run Migrations

```bash
alembic upgrade head
```

### 4.3 Seed Reference Data

Seed initial naval defense zones, default inspector (`inspector@navy.mil` / `password123`), and model records:

```bash
python -m app.db.seed
```

### 4.4 Start Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The interactive OpenAPI documentation is accessible at `http://localhost:8000/docs`.

---

## 5. API Endpoints

### Canonical Versioned Routes (`/api/v1/*`) & Compatibility Top-Level Routes:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticate inspector and receive signed JWT |
| `POST` | `/api/v1/auth/register` | Register new defense inspector account |
| `GET` | `/api/v1/auth/me` | Fetch authenticated inspector profile |
| `GET` | `/api/v1/zones` | List all registered naval platform zones |
| `POST` | `/api/v1/zones` | Register new defense platform zone |
| `GET` | `/api/v1/zones/{id}/defects` | Get defect history and verdict summary for a zone |
| `POST` | `/api/v1/inspections` | Upload specimen images, run ML/3D/grading pipeline |
| `GET` | `/api/v1/inspections` | List inspection history with thumbnails and verdicts |
| `GET` | `/api/v1/inspections/{id}` | Get full inspection payload, detections, and 3D mesh |
| `GET` | `/api/v1/inspections/{id}/status` | Check real-time pipeline processing status |
| `GET` | `/api/v1/inspections/{id}/report` | Download authoritative PDF audit report |
| `GET` | `/api/v1/models` | List active models and hardware acceleration device |
| `GET` | `/api/v1/health` | Service health, database dialect, and active models |

---

## 6. Benchmarking

### Run Pipeline Benchmark

```bash
python scripts/benchmark.py
```

Measures per-stage latencies:
- Preprocessing: ~40 ms
- ML/CV Hybrid Inference: ~28 ms
- Geometric Measurements: ~1 ms
- Open3D Surface Reconstruction: ~1.9 s
- Standards Grading: <1 ms
- ReportLab PDF Generation: ~22 ms
- Total Pipeline: ~1.99 s

---

## 7. Docker Deployment

Launch full production stack with PostgreSQL:

```bash
docker compose up --build -d
```
