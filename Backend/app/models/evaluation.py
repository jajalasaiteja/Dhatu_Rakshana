"""Evaluation and measurement entities for ISO-aligned coating standards grading."""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String, Text
from app.core.timezone import ISTDateTime, get_ist_now, format_ist_iso

class InspectionMeasurement(SQLModel, table=True):
    __tablename__ = "inspection_measurements"

    id: Optional[int] = Field(default=None, primary_key=True)
    inspection_id: int = Field(foreign_key="inspections.id", index=True)
    image_id: Optional[int] = Field(default=None, foreign_key="inspection_images.id", nullable=True, index=True)

    measurement_key: str = Field(max_length=100, index=True)
    measurement_name: str = Field(max_length=150, index=True)
    measurement_category: str = Field(max_length=100, index=True)  # QUANTITATIVE_DEFECT, ISO_4628_DEGRADATION, ISO_8501_SURFACE_PREP, DRY_FILM_THICKNESS, COATING_CONTINUITY, SURFACE_TOPOGRAPHY

    measured_value: Optional[str] = Field(default=None, max_length=255)
    numeric_value: Optional[float] = Field(default=None)
    unit: Optional[str] = Field(default=None, max_length=50)

    applicable_standard: Optional[str] = Field(default=None, max_length=150)
    standard_edition: Optional[str] = Field(default=None, max_length=100)
    rating_or_criterion: Optional[str] = Field(default=None, max_length=255)

    # Status: Measured, Assessed, Not measured, Not applicable, Insufficient evidence, Requires manual verification
    assessment_status: str = Field(default="Measured", max_length=50, index=True)

    confidence: Optional[float] = Field(default=None)
    measurement_method: Optional[str] = Field(default=None, max_length=255)
    evidence_source: Optional[str] = Field(default=None, max_length=255)
    explanation: Optional[str] = Field(default=None, sa_column=Column(Text))

    evaluation_engine_version: str = Field(default="2.0.0-iso-aligned", max_length=50)
    evaluation_timestamp: datetime = Field(default_factory=get_ist_now, sa_type=ISTDateTime)

    # Relationship
    inspection: Optional["Inspection"] = Relationship(back_populates="measurements")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "inspection_id": self.inspection_id,
            "image_id": self.image_id,
            "measurement_key": self.measurement_key,
            "measurement_name": self.measurement_name,
            "measurement_category": self.measurement_category,
            "measured_value": self.measured_value,
            "numeric_value": self.numeric_value,
            "unit": self.unit,
            "applicable_standard": self.applicable_standard,
            "standard_edition": self.standard_edition,
            "rating_or_criterion": self.rating_or_criterion,
            "assessment_status": self.assessment_status,
            "confidence": self.confidence,
            "measurement_method": self.measurement_method,
            "evidence_source": self.evidence_source,
            "explanation": self.explanation,
            "evaluation_engine_version": self.evaluation_engine_version,
            "evaluation_timestamp": format_ist_iso(self.evaluation_timestamp)
        }


class EvaluationHistory(SQLModel, table=True):
    __tablename__ = "evaluation_histories"

    id: Optional[int] = Field(default=None, primary_key=True)
    inspection_id: int = Field(foreign_key="inspections.id", index=True)

    evaluation_engine_version: str = Field(max_length=50)
    overall_verdict: str = Field(max_length=50)
    defect_count: int = Field(default=0)
    snapshot_data: str = Field(sa_column=Column(Text))

    evaluated_at: datetime = Field(default_factory=get_ist_now, sa_type=ISTDateTime)
    archived_at: datetime = Field(default_factory=get_ist_now, sa_type=ISTDateTime)

    # Relationship
    inspection: Optional["Inspection"] = Relationship(back_populates="evaluation_history")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "inspection_id": self.inspection_id,
            "evaluation_engine_version": self.evaluation_engine_version,
            "overall_verdict": self.overall_verdict,
            "defect_count": self.defect_count,
            "evaluated_at": format_ist_iso(self.evaluated_at),
            "archived_at": format_ist_iso(self.archived_at)
        }
