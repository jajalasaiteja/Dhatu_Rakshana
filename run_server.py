import os
import sys
from pathlib import Path

# Ensure both project root and backend folder are in sys.path
current_dir = Path(__file__).resolve().parent
if current_dir.name == "backend":
    root_dir = current_dir.parent
else:
    root_dir = current_dir

if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))
if str(root_dir / "backend") not in sys.path:
    sys.path.insert(0, str(root_dir / "backend"))

# Change working directory to root so relative paths (e.g. storage, .env) always resolve properly
os.chdir(root_dir)

import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("Starting Dhatu Rakshana FastAPI Backend on http://127.0.0.1:8000")
    print("=" * 60)
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
