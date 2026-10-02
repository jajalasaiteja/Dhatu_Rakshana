"""Entrypoint for python -m backend.reset_inspections or python reset_inspections.py."""

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.reset_inspections import main

if __name__ == "__main__":
    main()
