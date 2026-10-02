# Project Development Environment Setup

## Purpose

This document defines the exact development stack required for the
project and provides instructions for setting it up inside the **Gemini
Antigravity Docker container**.

The goal is to make the container reproducible so that Antigravity can
develop, run, test, and build the project without relying on packages
installed on the Windows host.

------------------------------------------------------------------------

# 1. Required Stack

## Backend

The backend uses Python 3.11.x and the following pinned packages:

``` text
fastapi==0.115.6
uvicorn==0.34.0
pydantic==2.10.5
sqlmodel==0.0.22
psycopg2-binary==2.9.10
alembic==1.14.1
python-dotenv==1.0.1
PyYAML==6.0.2
open3d==0.18.0
opencv-python==4.10.0.84
numpy==1.26.4
Pillow==10.4.0
scikit-learn==1.5.2
torch==2.5.1
torchvision==0.20.1
ultralytics==8.3.50
reportlab==4.2.5
```

### Python runtime

Required:

``` text
Python 3.11.x
```

The existing Antigravity Docker environment uses:

``` text
python:3.11.9-slim
```

Keep Python 3.11.9 unless the project explicitly requires another
version.

------------------------------------------------------------------------

# 2. Frontend

The frontend uses:

  Component            Required Version
  ------------------ ------------------
  Node.js                       24.14.0
  npm                           11.13.0
  React                          19.0.0
  React DOM                      19.0.0
  React Router DOM               7.18.4
  Recharts                       2.15.1
  Vite                            8.3.1
  Tailwind CSS                   3.4.17

The target environment is:

``` text
Node.js v24.14.0
npm v11.13.0
vite 8.3.1
tailwindcss 3.4.17
react 19.0.0
```

------------------------------------------------------------------------

# 3. Container System Requirements

The container should have the following system utilities/libraries
available:

``` text
curl
wget
ca-certificates
build-essential
git
bash
```

The backend additionally benefits from:

``` text
tesseract-ocr
poppler-utils
libgl1
libglib2.0-0
libsm6
libxext6
libxrender1
```

These are particularly useful for OpenCV, image processing, PDF
processing, and OCR workflows.

If the existing Docker image already contains these packages, do not
reinstall them unnecessarily.

------------------------------------------------------------------------

# 4. Backend Python Environment

## 4.1 Create a virtual environment

From the project root inside the container:

``` bash
python3 -m venv .venv
```

Activate it:

``` bash
source .venv/bin/activate
```

Verify:

``` bash
python --version
```

Expected:

``` text
Python 3.11.9
```

------------------------------------------------------------------------

# 5. Install Backend Dependencies

Upgrade packaging tools:

``` bash
python -m pip install --upgrade pip setuptools wheel
```

Create a file named:

``` text
requirements.txt
```

with exactly:

``` text
fastapi==0.115.6
uvicorn==0.34.0
pydantic==2.10.5
sqlmodel==0.0.22
psycopg2-binary==2.9.10
alembic==1.14.1
python-dotenv==1.0.1
PyYAML==6.0.2
open3d==0.18.0
opencv-python==4.10.0.84
numpy==1.26.4
Pillow==10.4.0
scikit-learn==1.5.2
torch==2.5.1
torchvision==0.20.1
ultralytics==8.3.50
reportlab==4.2.5
```

Install:

``` bash
pip install -r requirements.txt
```

Verify:

``` bash
pip list
```

Or verify the important packages directly:

``` bash
python -c "import fastapi, uvicorn, pydantic, sqlmodel, numpy, cv2, PIL, sklearn, torch, torchvision, ultralytics, open3d, reportlab; print('Backend dependencies imported successfully')"
```

------------------------------------------------------------------------

# 6. PyTorch Requirement

The required versions are:

``` text
torch==2.5.1
torchvision==0.20.1
```

For the Docker development environment, install the standard compatible
PyPI packages unless the project specifically requires NVIDIA CUDA
support.

Verify:

``` bash
python -c "import torch; print('Torch:', torch.__version__); print('CUDA available:', torch.cuda.is_available())"
```

A CPU-only container may correctly report:

``` text
CUDA available: False
```

Do not treat this as an installation failure.

If GPU acceleration is explicitly required later, configure the Docker
image with a compatible NVIDIA CUDA runtime and NVIDIA Container Toolkit
rather than changing the application dependency versions arbitrarily.

------------------------------------------------------------------------

# 7. OpenCV and Headless Docker Considerations

The project requires:

``` text
opencv-python==4.10.0.84
```

Keep this exact package unless the project is intentionally changed.

If OpenCV reports missing shared-library errors, ensure the container
has:

``` bash
apt-get update
apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1
```

Then test:

``` bash
python -c "import cv2; print('OpenCV:', cv2.__version__)"
```

Expected:

``` text
OpenCV: 4.10.0
```

------------------------------------------------------------------------

# 8. Node.js Environment

The required Node.js version is:

``` text
24.14.0
```

The required npm version is:

``` text
11.13.0
```

Verify:

``` bash
node --version
npm --version
```

Expected:

``` text
v24.14.0
11.13.0
```

## Important

Do not replace Node.js with an older version simply because another
project uses Node 18 or Node 20.

This project specifically uses:

``` text
Node 24.14.0
```

------------------------------------------------------------------------

# 9. Installing Node.js in the Container

If Node.js 24.14.0 is not already installed, install it using a
reproducible Node.js installation method.

One option is NodeSource:

``` bash
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs
```

Then check:

``` bash
node -v
npm -v
```

If the installed Node/npm versions differ from the required versions,
use the project's package-manager/version-management mechanism rather
than silently accepting a different runtime.

The final environment should report:

``` text
Node v24.14.0
npm 11.13.0
```

------------------------------------------------------------------------

# 10. Frontend Project Dependencies

From the frontend project directory, install the exact application
dependencies:

``` bash
npm install \
  react@19.0.0 \
  react-dom@19.0.0 \
  react-router-dom@7.18.4 \
  recharts@2.15.1
```

Install the development dependencies:

``` bash
npm install -D \
  vite@8.3.1 \
  tailwindcss@3.4.17
```

This results in the core dependency set:

``` text
react@19.0.0
react-dom@19.0.0
react-router-dom@7.18.4
recharts@2.15.1
vite@8.3.1
tailwindcss@3.4.17
```

------------------------------------------------------------------------

# 11. Verify React

Run:

``` bash
npm list react react-dom
```

Expected core versions:

``` text
react@19.0.0
react-dom@19.0.0
```

React Router and Recharts may show React as a deduplicated dependency.
This is normal.

------------------------------------------------------------------------

# 12. Verify React Router

Run:

``` bash
npm list react-router-dom react-router
```

Expected:

``` text
react-router-dom@7.18.4
react-router@7.18.4
```

The project should use the React Router API corresponding to version 7.

Do not automatically rewrite routing code for another major version.

------------------------------------------------------------------------

# 13. Verify Recharts

Run:

``` bash
npm list recharts
```

Expected:

``` text
recharts@2.15.1
```

------------------------------------------------------------------------

# 14. Verify Vite

Run:

``` bash
npx vite --version
```

Expected:

``` text
vite/8.3.1
```

Also verify:

``` bash
npm list vite
```

Expected:

``` text
vite@8.3.1
```

------------------------------------------------------------------------

# 15. Verify Tailwind CSS

Run:

``` bash
npm list tailwindcss
```

Expected:

``` text
tailwindcss@3.4.17
```

The project uses **Tailwind CSS 3**, not Tailwind CSS 4.

This distinction is important because Tailwind 3 and Tailwind 4 use
different configuration and setup approaches.

Do not upgrade Tailwind automatically.

------------------------------------------------------------------------

# 16. Recommended Frontend package.json

The project's frontend `package.json` should contain at least the
following versions.

Do not remove any other existing dependencies from the project's actual
`package.json`.

``` json
{
  "dependencies": {
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "react-router-dom": "7.18.4",
    "recharts": "2.15.1"
  },
  "devDependencies": {
    "tailwindcss": "3.4.17",
    "vite": "8.3.1"
  }
}
```

If the project already has additional dependencies such as:

``` text
@vitejs/plugin-react
typescript
eslint
postcss
autoprefixer
```

preserve them. Do not delete or replace existing project configuration
just to match this document.

------------------------------------------------------------------------

# 17. Existing Project Installation vs Fresh Project

## If the project already contains package.json

Do NOT initialize a new React project.

Instead:

``` bash
npm install
```

Then verify:

``` bash
npm list react react-dom react-router-dom recharts vite tailwindcss
```

If the existing `package-lock.json` is part of the project, prefer:

``` bash
npm ci
```

because it reproduces the locked dependency tree.

## If package.json does not exist

Install the required packages manually using:

``` bash
npm install react@19.0.0 react-dom@19.0.0 react-router-dom@7.18.4 recharts@2.15.1
```

and:

``` bash
npm install -D vite@8.3.1 tailwindcss@3.4.17
```

Do not run `npm create vite@latest` over an existing project.

------------------------------------------------------------------------

# 18. Database

The Python stack uses:

``` text
psycopg2-binary==2.9.10
sqlmodel==0.0.22
alembic==1.14.1
```

The application therefore expects PostgreSQL connectivity.

The PostgreSQL server does not necessarily need to run inside the same
application container.

The project may instead connect to:

``` text
A separate PostgreSQL Docker container
```

or:

``` text
A PostgreSQL server accessible from the development environment
```

The database connection should be supplied through environment variables
rather than hard-coded credentials.

------------------------------------------------------------------------

# 19. Environment Variables

The project uses:

``` text
python-dotenv==1.0.1
```

Antigravity should preserve the project's existing
`.env`/environment-variable design.

Do not commit secrets into source code.

Typical configuration uses self-contained SQLite:

``` text
DATABASE_URL=sqlite:///./data/dhatu_rakshana.db
```

(Optional production PostgreSQL: `DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/db`)

The exact environment-variable names must come from the project's
existing configuration.

Do not invent new variable names if the application already defines
them.

------------------------------------------------------------------------

# 20. Alembic

The required version is:

``` text
alembic==1.14.1
```

After installing backend dependencies:

``` bash
alembic --version
```

Expected major/minor version:

``` text
alembic 1.14.1
```

Do not automatically run migrations against a production database.

Only run migrations against the intended development database.

If the project already has an Alembic configuration, use:

``` bash
alembic upgrade head
```

only when the development database is available and migration execution
is expected.

------------------------------------------------------------------------

# 21. Running the Backend

The exact application module should be determined from the existing
project structure.

For example, if the project contains:

``` text
backend/
    main.py
```

and `main.py` contains:

``` python
app = FastAPI()
```

the command would be:

``` bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Do not assume `backend.main:app` if the existing project uses another
module path.

First inspect the repository and identify the actual FastAPI application
object.

------------------------------------------------------------------------

# 22. Running the Frontend

From the frontend directory:

``` bash
npm run dev -- --host 0.0.0.0
```

The Vite development server normally runs on:

``` text
http://localhost:5173
```

The exact port should follow the project's existing Vite configuration.

------------------------------------------------------------------------

# 23. Backend/Frontend Communication

The frontend and backend may run as separate processes:

``` text
Frontend
React + Vite
     |
     | HTTP/REST
     v
Backend
FastAPI + Uvicorn
     |
     v
PostgreSQL
```

When running inside Docker, ensure the frontend and backend bind to:

``` text
0.0.0.0
```

rather than only:

``` text
127.0.0.1
```

This allows access through Docker port mappings.

------------------------------------------------------------------------

# 24. Antigravity Docker Workspace

The Antigravity container should mount the project directory into:

``` text
/workspace
```

The working directory should be:

``` bash
cd /workspace
```

The expected workflow is:

``` bash
cd /workspace
```

then inspect the project:

``` bash
ls
```

If the repository contains separate directories such as:

``` text
backend/
frontend/
```

install backend dependencies in the backend environment and frontend
dependencies in the frontend directory.

------------------------------------------------------------------------

# 25. Recommended Directory Pattern

If the project follows a conventional structure:

``` text
/workspace
├── backend/
│   ├── requirements.txt
│   ├── alembic.ini
│   └── ...
│
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.*
│   ├── tailwind.config.*
│   └── ...
│
└── ...
```

Then:

### Backend

``` bash
cd /workspace/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend

``` bash
cd /workspace/frontend
npm ci
```

If there is no `package-lock.json`:

``` bash
npm install
```

------------------------------------------------------------------------

# 26. Full Verification Checklist

After setup, run the following.

## Python

``` bash
python --version
```

Expected:

``` text
Python 3.11.9
```

## FastAPI

``` bash
python -c "import fastapi; print(fastapi.__version__)"
```

Expected:

``` text
0.115.6
```

## Uvicorn

``` bash
python -c "import uvicorn; print(uvicorn.__version__)"
```

Expected:

``` text
0.34.0
```

## Pydantic

``` bash
python -c "import pydantic; print(pydantic.__version__)"
```

Expected:

``` text
2.10.5
```

## NumPy

``` bash
python -c "import numpy; print(numpy.__version__)"
```

Expected:

``` text
1.26.4
```

## OpenCV

``` bash
python -c "import cv2; print(cv2.__version__)"
```

Expected:

``` text
4.10.0
```

## PyTorch

``` bash
python -c "import torch; print(torch.__version__)"
```

Expected:

``` text
2.5.1
```

## Torchvision

``` bash
python -c "import torchvision; print(torchvision.__version__)"
```

Expected:

``` text
0.20.1
```

## Ultralytics

``` bash
python -c "import ultralytics; print(ultralytics.__version__)"
```

Expected:

``` text
8.3.50
```

## Open3D

``` bash
python -c "import open3d; print(open3d.__version__)"
```

Expected:

``` text
0.18.0
```

## Node

``` bash
node --version
```

Expected:

``` text
v24.14.0
```

## npm

``` bash
npm --version
```

Expected:

``` text
11.13.0
```

## React

``` bash
npm list react react-dom
```

Expected:

``` text
react@19.0.0
react-dom@19.0.0
```

## React Router

``` bash
npm list react-router-dom
```

Expected:

``` text
react-router-dom@7.18.4
```

## Recharts

``` bash
npm list recharts
```

Expected:

``` text
recharts@2.15.1
```

## Vite

``` bash
npx vite --version
```

Expected:

``` text
vite/8.3.1
```

## Tailwind

``` bash
npm list tailwindcss
```

Expected:

``` text
tailwindcss@3.4.17
```

------------------------------------------------------------------------

# 27. One-Shot Backend Installation

For a fresh Python 3.11.9 container, the following sequence can be used:

``` bash
cd /workspace

python3 -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip setuptools wheel

pip install \
    fastapi==0.115.6 \
    uvicorn==0.34.0 \
    pydantic==2.10.5 \
    sqlmodel==0.0.22 \
    psycopg2-binary==2.9.10 \
    alembic==1.14.1 \
    python-dotenv==1.0.1 \
    PyYAML==6.0.2 \
    open3d==0.18.0 \
    opencv-python==4.10.0.84 \
    numpy==1.26.4 \
    Pillow==10.4.0 \
    scikit-learn==1.5.2 \
    torch==2.5.1 \
    torchvision==0.20.1 \
    ultralytics==8.3.50 \
    reportlab==4.2.5
```

------------------------------------------------------------------------

# 28. One-Shot Frontend Installation

From the frontend directory:

``` bash
cd /workspace/frontend

npm install \
    react@19.0.0 \
    react-dom@19.0.0 \
    react-router-dom@7.18.4 \
    recharts@2.15.1

npm install -D \
    vite@8.3.1 \
    tailwindcss@3.4.17
```

If the project already has a correct `package.json` and
`package-lock.json`, prefer:

``` bash
npm ci
```

instead of manually reinstalling dependencies.

------------------------------------------------------------------------

# 29. Important Rules for Antigravity

When working on this project:

1.  **Do not upgrade dependencies automatically.**
2.  **Do not change the Python version without a specific requirement.**
3.  **Do not replace Tailwind CSS 3 with Tailwind CSS 4.**
4.  **Do not replace React 19 with another major version.**
5.  **Do not replace Vite 8 with another major version.**
6.  **Do not recreate an existing React project using
    `npm create vite`.**
7.  **Do not delete `package-lock.json` unless there is a specific
    dependency-resolution reason.**
8.  **Do not delete an existing Python virtual environment unless it is
    intentionally being recreated.**
9.  **Do not hard-code database credentials or API keys.**
10. **Preserve the existing project structure and configuration.**
11. **Before changing dependencies, inspect the existing `package.json`
    and Python dependency files.**
12. **Prefer the project's existing lock files when available.**

------------------------------------------------------------------------

# 30. Final Environment Target

The completed Antigravity development environment should contain:

``` text
========================================
BACKEND
========================================
Python              3.11.9
FastAPI             0.115.6
Uvicorn             0.34.0
Pydantic            2.10.5
SQLModel            0.0.22
psycopg2-binary     2.9.10
Alembic             1.14.1
python-dotenv       1.0.1
PyYAML              6.0.2
Open3D              0.18.0
OpenCV              4.10.0.84
NumPy               1.26.4
Pillow              10.4.0
scikit-learn        1.5.2
PyTorch             2.5.1
Torchvision         0.20.1
Ultralytics         8.3.50
ReportLab           4.2.5

========================================
FRONTEND
========================================
Node.js             24.14.0
npm                 11.13.0
React               19.0.0
React DOM           19.0.0
React Router DOM    7.18.4
Recharts            2.15.1
Vite                8.3.1
Tailwind CSS        3.4.17
========================================
```

The environment is considered correctly configured only when the
installed versions match the target versions above, subject to the
project's existing lock files and configuration.
