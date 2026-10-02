"""Application constants and enumerations for Dhatu Rakshana."""

from enum import Enum

class InspectionStatus(str, Enum):
    PENDING = "PENDING"
    VALIDATING = "VALIDATING"
    PREPROCESSING = "PREPROCESSING"
    DETECTING = "DETECTING"
    MAPPING = "MAPPING"
    MEASURING = "MEASURING"
    GRADING = "GRADING"
    REPORTING = "REPORTING"
    COMPLETED = "COMPLETED"
    COMPLETED_WITH_WARNINGS = "COMPLETED_WITH_WARNINGS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class DefectClass(str, Enum):
    CORROSION = "corrosion"
    BLISTER = "blister"
    SCRATCH = "scratch"
    PINHOLE = "pinhole"
    INCLUSION = "inclusion"
    CONTAMINATION = "contamination"
    DUST_PARTICLE = "dust_particle"
    NO_DEFECT = "no_defect"

class SeverityLevel(str, Enum):
    NEGLIGIBLE = "Negligible"
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class Verdict(str, Enum):
    PASS = "PASS"
    REVIEW = "REVIEW"
    FAIL = "FAIL"

class UserRole(str, Enum):
    INSPECTOR = "inspector"
    LEAD_INSPECTOR = "lead_inspector"
    ADMIN = "admin"

class ArtifactType(str, Enum):
    SOURCE_IMAGE = "SOURCE_IMAGE"
    ANNOTATED_IMAGE = "ANNOTATED_IMAGE"
    MASK = "MASK"
    MESH_PLY = "MESH_PLY"
    MESH_OBJ = "MESH_OBJ"
    PDF_REPORT = "PDF_REPORT"
    JSON_RESULT = "JSON_RESULT"
