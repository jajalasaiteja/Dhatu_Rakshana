FROM python:3.11-slim

# Install system dependencies for Open3D and image operations
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglx-mesa0 \
    libgomp1 \
    libglib2.0-0 \
    libx11-6 \
    libxext6 \
    libxrender-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY db/ ./db/
COPY backend/ ./backend/
COPY ml/ ./ml/
COPY demo_full_pipeline.py ./

ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
