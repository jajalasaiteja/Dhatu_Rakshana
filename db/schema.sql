-- Standalone PostgreSQL Schema for Defense Marine Platform Coating Inspection System

CREATE TABLE IF NOT EXISTS zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    asset_description VARCHAR(255) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inspections (
    id SERIAL PRIMARY KEY,
    image_path VARCHAR(500) NOT NULL,
    mesh_path VARCHAR(500),
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    overall_verdict VARCHAR(50) DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS detections (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    "class" VARCHAR(50) NOT NULL,
    subtype VARCHAR(50) NOT NULL,
    bbox TEXT NOT NULL,
    confidence DOUBLE PRECISION DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS graded_defect_records (
    id SERIAL PRIMARY KEY,
    detection_id INTEGER NOT NULL REFERENCES detections(id) ON DELETE CASCADE,
    standard_reference VARCHAR(200) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    pass_fail VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inspections_zone_id ON inspections(zone_id);
CREATE INDEX IF NOT EXISTS idx_detections_inspection_id ON detections(inspection_id);
CREATE INDEX IF NOT EXISTS idx_graded_detection_id ON graded_defect_records(detection_id);
