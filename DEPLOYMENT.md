# Dhatu Rakshana (धातु रक्षण) — Cloud & Production Deployment Guide

This guide describes how to deploy the **Dhatu Rakshana** Marine Coating Defect Inspection & 3D Micro-Topography Analysis Platform to a cloud server (AWS EC2, Azure VM, DigitalOcean Droplet, GCP Compute Engine) or an on-premise Naval defense intranet server using **Docker Compose**.

---

## 1. Production Architecture Overview

```
                      Internet / Naval Intranet
                                  │
                                  ▼ Port 80 (HTTP) / 443 (HTTPS)
                      ┌──────────────────────┐
                      │     dhatu_nginx      │  Reverse Proxy & Asset Accelerator
                      │    (Nginx Alpine)    │  (client_max_body_size: 100MB)
                      └──────────┬───────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼ Port 8000 (Internal)          ▼ (Static files/meshes)
    ┌──────────────────────────┐          ┌──────────────────────────┐
    │      dhatu_backend       │          │   inspection_storage     │
    │  FastAPI + PyTorch/YOLO  │◄────────►│   (Named Volume: PLY,    │
    │  ResNet18 + Open3D       │          │    PDFs, 20MP photos)    │
    └────────────┬─────────────┘          └──────────────────────────┘
                 │
                 ▼ Port 5432 (Internal)
    ┌──────────────────────────┐          ┌──────────────────────────┐
    │      dhatu_postgres      │◄────────►│      postgres_data       │
    │  (PostgreSQL 16 Alpine)  │          │   (Named Volume: DB Data)│
    └──────────────────────────┘          └──────────────────────────┘
```

---

## 2. Key Components

| Container Service | Base Image | Role | Port Mapping |
| :--- | :--- | :--- | :--- |
| **`postgres`** | `postgres:16-alpine` | Relational database storing inspections, zones, detections, and ISO grades | `5432:5432` |
| **`backend`** | Custom Python 3.11 | FastAPI server, 2-stage YOLO+ResNet inference, Open3D surface reconstruction, and React SPA serving | `8000:8000` |
| **`nginx`** | `nginx:1.27-alpine` | High-performance reverse proxy, 100MB high-res body buffer, and Gzip compression | `80:80` |

---

## 3. Quick Start (Single Command Deployment)

### Step 1: Clone or Copy Project onto Server
```bash
git clone <your-repository-url> Dhatu_Rakshana
cd Dhatu_Rakshana
```

### Step 2: Configure Environment Variables
Copy the production environment template:
```bash
cp .env.docker .env
```
*(Optionally edit `.env` to set your custom `POSTGRES_PASSWORD` and `JWT_SECRET_KEY`)*

### Step 3: Launch Stack with Docker Compose
```bash
docker compose --env-file .env up --build -d
```

### Step 4: Verify All Services are Healthy
```bash
docker compose ps
```
You should see all three containers (`dhatu_postgres`, `dhatu_backend`, `dhatu_nginx`) in `Up (healthy)` state.

---

## 4. Accessing the Platform

Once the containers are running:
* **Web User Interface:** `http://<your-server-ip>/`
* **API Documentation (Swagger UI):** `http://<your-server-ip>/docs`
* **Backend API Base:** `http://<your-server-ip>/api/v1`
* **Service Health Check:** `http://<your-server-ip>/api/v1/health`
* **Default Inspector Credentials:**
  * **Email:** `inspector@navy.mil`
  * **Password:** `password123`

---

## 5. Persistent Data & Storage Management

All data is stored in isolated, persistent Docker volumes:

1. **`postgres_data`**:
   * Contains all PostgreSQL tables, users, platform zones, and inspection history.
   * Remains completely preserved across container updates and host reboots.
2. **`inspection_storage`**:
   * Contains raw $20\text{MP}$ uploaded specimen photos, bounding box crops, Open3D `.ply` surface topography meshes, and ReportLab PDF audit reports.
3. **`./models`** *(Host Mount)*:
   * Mounted directly as read-only from `./models` on the host.
   * Model weights (`yolo_detector.pt` and `resnet_classifier.pt`) can be updated anytime without rebuilding Docker images.

---

## 6. Common Operations & Maintenance

### View Live Container Logs
```bash
# Stream all logs
docker compose logs -f

# Stream only backend AI inference logs
docker compose logs -f backend

# Stream database query logs
docker compose logs -f postgres
```

### Trigger Database Backup
The backend provides an atomic backup endpoint:
```bash
curl -X POST http://localhost:8000/api/v1/system/backup
```

### Restart Services
```bash
# Restart entire platform
docker compose restart

# Restart only backend after updating model weights
docker compose restart backend
```

### Stop Services Safely
```bash
docker compose down
```
*(Note: Do not pass `-v` unless you want to intentionally wipe all database records and images).*

---

## 7. Enabling SSL / HTTPS in Production

To enable encrypted HTTPS on a public domain (e.g., `dhatu.navy.mil`):

1. Install Certbot on the host:
   ```bash
   sudo apt update && sudo apt install certbot -y
   ```
2. Request a certificate:
   ```bash
   sudo certbot certonly --standalone -d your-domain.com
   ```
3. Mount the certificates into `nginx/nginx.conf` and expose port `443:443` in `docker-compose.yml`.
