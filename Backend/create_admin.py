"""Entrypoint for python -m backend.create_admin or python create_admin.py."""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.create_admin import main

if __name__ == "__main__":
    main()
