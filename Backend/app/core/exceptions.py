"""Centralized domain exceptions and FastAPI exception handlers."""

from fastapi import Request, status
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger("dhatu_rakshana.exceptions")

class DhatuRakshanaError(Exception):
    """Base exception for all domain errors."""
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR, error_code: str = "INTERNAL_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code

class EntityNotFoundError(DhatuRakshanaError):
    def __init__(self, entity_name: str, identifier: any):
        super().__init__(
            message=f"{entity_name} with identifier '{identifier}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="ENTITY_NOT_FOUND"
        )

class StorageError(DhatuRakshanaError):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, error_code="STORAGE_ERROR")

class FileValidationError(DhatuRakshanaError):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST, error_code="FILE_VALIDATION_ERROR")

class MLInferenceError(DhatuRakshanaError):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, error_code="ML_INFERENCE_ERROR")

class ReconstructionError(DhatuRakshanaError):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, error_code="RECONSTRUCTION_ERROR")

class GradingError(DhatuRakshanaError):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, error_code="GRADING_ERROR")

async def dhatu_exception_handler(request: Request, exc: DhatuRakshanaError):
    logger.warning(f"Domain exception on {request.method} {request.url.path}: {exc.error_code} - {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "message": exc.message,
            "detail": exc.message,
            "path": request.url.path
        }
    )
