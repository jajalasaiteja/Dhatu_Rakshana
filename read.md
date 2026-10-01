# Dhatu Rakshana (धातु रक्षण)
### Defense Marine Platform Coating Inspection & Standards Grading System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat&logo=react)](https://react.dev/)
[![Open3D](https://img.shields.io/badge/Open3D-0.20-blue.svg?style=flat)](http://www.open3d.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2F18-336791.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat&logo=docker)](https://www.docker.com/)

**Dhatu Rakshana** is an AI-powered maritime defense inspection platform engineered for naval fleet coating integrity. It provides real-time Open3D micro-topography reconstruction, localized defect identification (pinholes, mechanical scratches, inclusions, and contamination), deterministic standards compliance evaluation (SSPC-PA 2, NACE SP0188, ISO 4628, ISO 8501), and persistent audit trails in PostgreSQL.

---

## Table of Contents

1. [Features & Capabilities](#features--capabilities)
2. [Default Inspector Credentials](#default-inspector-credentials)
3. [Method 1: Run with Docker Desktop (Recommended)](#method-1-run-with-docker-desktop-recommended)
4. [Method 2: Run Locally on Host Machine](#method-2-run-locally-on-host-machine)
5. [Monitoring Live Logs](#monitoring-live-logs)
6. [Project Structure](#project-structure)
7. [Git Workflow & Pushing to GitHub](#git-workflow--pushing-to-github)

---

## Features & Capabilities

* **AI Defect Inspection**: Evaluates marine specimen images across platform zones with 1-click test defect presets (*Pinhole / Holiday*, *Mechanical Scratch*, *Contamination*, *Particulate Cluster*).
* **3D Micro-Topography Viewer**: Real-time Three.js surface elevation rendering with mouse orbit rotation, wireframe toggling, and downloadable `.PLY` / `.OBJ` meshes.
* **Deterministic Standards Compliance Engine**:
  * **SSPC-PA 2 / NACE SP0188**: Dry film thickness and localized holiday discontinuity limits.
  * **ISO 4628-2 to 4628-5**: Blistering, rusting, cracking, and flaking density grading.
  * **ISO 8501-1**: Surface preparation rust grades and contamination assessment.
* **Strict Database Authentication**: Secure SHA-256 hashed inspector credentials backed by PostgreSQL.
* **Audit History & Logs**: Chronological scan history with pass/review/fail verdicts filtered by platform zone.

---

## Default Inspector Credentials

A pre-seeded inspector account is ready in the database:

| Field | Value |
| :--- | :--- |
| **Email** | `inspector@navy.mil` |
| **Password** | `password123` |
| **Role** | Chief Naval Coating Inspector |

*(You can also click **Register Account** on the website to create a new inspector profile).*

---

## Method 1: Run with Docker Desktop (Recommended)

### Step 1: Open Docker Desktop
Ensure **Docker Desktop** is running on your system (confirm the bottom-left icon in Docker Desktop is green).

### Step 2: Prevent Port Conflict (If local Postgres is running)
If PostgreSQL is running as a local Windows service, stop it temporarily so Docker's PostgreSQL container can bind to port `5432`:
```powershell
Stop-Service postgresql-x64-18
```

### Step 3: Build and Start Containers
From the project root directory, run:
```powershell
docker compose up --build
```
*(To run in the background as detached containers, add `-d`: `docker compose up -d`)*

### Step 4: Access the Stack
* **Public Home Page**: [http://localhost:5173/](http://localhost:5173/)
* **Inspector Dashboard**: [http://localhost:5173/dashboard](http://localhost:5173/dashboard)
* **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **PostgreSQL Service**: `localhost:5432` (`marine_defect_db`)

### Step 5: Stop Containers
Press `Ctrl + C` in the running terminal, or run:
```powershell
docker compose down
```

---

## Method 2: Run Locally on Host Machine

If you prefer running without Docker directly on your Windows/Linux machine:

### 1. Backend Setup (FastAPI + Open3D + PostgreSQL)
```powershell
# Navigate to project directory
cd C:\Users\Saiteja\.gemini\antigravity\scratch\marine-coating-defect-system

# Install Python requirements
pip install -r backend/requirements.txt

# Seed platform zones and default inspector account
py db/seed.py

# Launch the FastAPI backend server
py run_server.py
```
*Backend will start on: **http://127.0.0.1:8000***

### 2. Frontend Setup (React 19 + Vite)
Open a **new terminal**:
```powershell
# Navigate to frontend folder
cd C:\Users\Saiteja\.gemini\antigravity\scratch\marine-coating-defect-system\frontend

# Install node dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend will start on: **http://localhost:5173***

---

## Monitoring Live Logs

### When Running with Docker:
* **Docker Desktop GUI**: Open Docker Desktop $\rightarrow$ Click **Containers** $\rightarrow$ Click on `dhatu_backend`, `dhatu_frontend`, or `dhatu_postgres` $\rightarrow$ View live streaming **Logs** tab.
* **Terminal CLI**:
  ```powershell
  # Stream all container logs together
  docker compose logs -f

  # Stream only backend logs
  docker compose logs -f backend

  # Stream only frontend logs
  docker compose logs -f frontend

  # Stream only database logs
  docker compose logs -f db
  ```

### When Running Locally:
* Backend logs stream directly to the terminal where `py run_server.py` is running.
* Frontend logs stream directly to the terminal where `npm run dev` is running.

---

## Project Structure

```
marine-coating-defect-system/
├── backend/
│   ├── app/
│   │   ├── routes/            # API endpoints (/auth, /inspections, /zones)
│   │   ├── services/          # Mapping (Open3D), Detection, Grading services
│   │   ├── config.py          # Storage and threshold paths
│   │   ├── main.py            # FastAPI application entrypoint
│   │   └── storage.py         # S3-compatible local filesystem storage
│   ├── config/                # Defense standards thresholds YAML
│   ├── storage/               # Ingested specimens and 3D .ply/.obj meshes
│   ├── Dockerfile             # Container definition for Python 3.11 backend
│   └── requirements.txt       # Python dependencies
├── db/
│   ├── db.py                  # Database engine session & connection
│   ├── models.py              # SQLModel table definitions (Zone, Inspection, Detection, User)
│   └── seed.py                # Database seeder (Zones & Inspector Sharma)
├── frontend/
│   ├── src/
│   │   ├── api/client.js      # Centralized API fetch client with auth token handling
│   │   ├── components/        # AppLayout, 3D Topography Viewer, Dropzone, Badges
│   │   ├── context/           # AuthContext (Inspector session management)
│   │   ├── pages/             # HomePage, Dashboard/Upload, History, Result, Login, Register
│   │   └── App.jsx            # Routing configuration
│   ├── Dockerfile             # Container definition for Node.js frontend
│   └── package.json           # Frontend dependencies
├── docker-compose.yml         # Multi-container orchestration (db, backend, frontend)
├── run_server.py              # Universal backend launcher
└── read.md                    # Project run & deployment instructions
```

---

## Git Workflow & Pushing to GitHub

To push this codebase to your GitHub repository under the **`prototype`** (or `protype`) branch:

```powershell
# 1. Initialize git
git init

# 2. Stage all clean project files
git add .

# 3. Commit
git commit -m "feat: Dhatu Rakshana marine coating inspection system prototype"

# 4. Set branch name
git branch -M prototype

# 5. Connect to your GitHub repository
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY>.git

# 6. Push to GitHub
git push -u origin prototype
```
*(If your branch on GitHub is named `protype`, replace `prototype` with `protype` in steps 4 and 6).*
