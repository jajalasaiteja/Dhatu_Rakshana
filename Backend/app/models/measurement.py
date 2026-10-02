"""DefectMeasurement entity for quantitative computer vision geometry."""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship

class DefectMeasurement(SQLModel, table=True):
    __tablename__ = "defect_measurements"

    id: Optional[int] = Field(default=None, primary_key=True)
    detection_id: int = Field(foreign_key="detections.id", unique=True, index=True)

    bbox_width: float = Field(default=0.0)
    bbox_height: float = Field(default=0.0)
    aspect_ratio: float = Field(default=1.0)
    pixel_area: float = Field(default=0.0)
    area_pct: float = Field(default=0.0)
    centroid_x: float = Field(default=0.0)
    centroid_y: float = Field(default=0.0)

    # 3D surface micro-topography fusion proxies
    surface_depth_proxy: Optional[float] = Field(default=None)
    roughness_index: Optional[float] = Field(default=None)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    detection: Optional["Detection"] = Relationship(back_populates="measurement")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "detection_id": self.detection_id,
            "bbox_width": round(self.bbox_width, 2),
            "bbox_height": round(self.bbox_height, 2),
            "aspect_ratio": round(self.aspect_ratio, 3),
            "pixel_area": round(self.pixel_area, 2),
            "area_pct": round(self.area_pct, 4),
            "centroid_x": round(self.centroid_x, 2),
            "centroid_y": round(self.centroid_y, 2),
            "surface_depth_proxy": round(self.surface_depth_proxy, 4) if self.surface_depth_proxy is not None else None,
            "roughness_index": round(self.roughness_index, 4) if self.roughness_index is not None else None
        }
