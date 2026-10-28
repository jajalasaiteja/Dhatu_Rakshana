# ==============================================================================
# Multi-Stage Production Dockerfile for Dhatu Rakshana
# Stage 1: Build Optimized React 19 Frontend Bundle
# Stage 2: Production Python 3.11 Backend Runtime (FastAPI + PyTorch + OpenCV)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Frontend Build Stage
# ------------------------------------------------------------------------------
FROM node:22-alpine AS frontend-builder

WORKDIR /build

# Cache dependency installations
COPY Frontend/package.json Frontend/package-lock.json* ./
RUN npm ci --prefer-offline || npm install

# Copy frontend source code and compile production distribution
COPY Frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Backend Runtime Stage
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

# System runtime dependencies for OpenCV Headless, Open3D, and PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH="/app/Backend:/app"

WORKDIR /app

# Install pinned Python dependencies
COPY Backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy Backend application code
COPY Backend/ ./Backend/

# Copy compiled frontend distribution from Stage 1 into /app/Frontend/dist
COPY --from=frontend-builder /build/dist ./Frontend/dist

# Copy reference data and setup templates
COPY data/ ./data/

# Initialize storage and models mount points
RUN mkdir -p storage/buckets/marine-inspections storage/topology models

WORKDIR /app/Backend

EXPOSE 8000

# Health check to verify service availability
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
