"""Local filesystem storage adapter mimicking S3 object storage with SHA-256 integrity."""

import os
import uuid
import hashlib
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Tuple, Optional
import re

from app.core.config import settings
from app.core.exceptions import StorageError, FileValidationError
from app.storage.base import BaseStorageAdapter

class LocalStorageAdapter(BaseStorageAdapter):
    def __init__(self, base_dir: Optional[Path] = None, bucket_name: Optional[str] = None):
        from app.core.config import BACKEND_DIR
        self.base_dir = Path(base_dir or settings.STORAGE_DIR)
        self.bucket_name = bucket_name or settings.STORAGE_BUCKET
        self.bucket_path = self.base_dir / "buckets" / self.bucket_name
        self.bucket_path.mkdir(parents=True, exist_ok=True)

        # Standard self-contained storage layout
        for folder in ["inspections", "temporary", "images", "meshes", "reports"]:
            (self.base_dir / folder).mkdir(parents=True, exist_ok=True)
            (self.bucket_path / folder).mkdir(parents=True, exist_ok=True)

        # If base_dir differs from BACKEND_DIR / 'storage', preserve existing sample scans/meshes/reports
        backend_storage_bucket = BACKEND_DIR / "storage" / "buckets" / self.bucket_name
        if backend_storage_bucket.exists() and backend_storage_bucket.resolve() != self.bucket_path.resolve():
            for src_file in backend_storage_bucket.glob("**/*"):
                if src_file.is_file():
                    rel_p = src_file.relative_to(backend_storage_bucket)
                    dst_p = self.bucket_path / rel_p
                    if not dst_p.exists():
                        dst_p.parent.mkdir(parents=True, exist_ok=True)
                        try:
                            shutil.copy2(src_file, dst_p)
                        except Exception:
                            pass

    def _sanitize_filename(self, filename: str) -> str:
        # Strip directory components to prevent path traversal
        clean = Path(filename).name
        # Keep alphanumeric, dashes, dots, underscores
        clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", clean)
        return clean or "scan.png"

    def _generate_s3_key(self, filename: str, subfolder: str = "images") -> str:
        now = datetime.now(timezone.utc)
        clean_name = self._sanitize_filename(filename)
        unique_prefix = uuid.uuid4().hex[:10]
        return f"{subfolder}/{now.year:04d}/{now.month:02d}/{now.day:02d}/{unique_prefix}_{clean_name}"

    def _calculate_sha256(self, file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    def save_bytes(self, file_bytes: bytes, filename: str, subfolder: str = "images") -> Tuple[str, Path, str]:
        if not file_bytes:
            raise FileValidationError("Cannot save empty byte content.")
        
        checksum = self._calculate_sha256(file_bytes)
        key = self._generate_s3_key(filename, subfolder)
        target_path = self.bucket_path / key
        target_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(target_path, "wb") as f:
                f.write(file_bytes)
        except Exception as exc:
            raise StorageError(f"Failed to persist file {filename} to {target_path}: {exc}")

        return key, target_path, checksum

    def save_file_from_path(self, source_path: Path, filename: str, subfolder: str = "meshes") -> Tuple[str, Path, str]:
        source_p = Path(source_path)
        if not source_p.exists():
            raise StorageError(f"Source file does not exist: {source_p}")

        try:
            with open(source_p, "rb") as f:
                content = f.read()
            checksum = self._calculate_sha256(content)
        except Exception as exc:
            raise StorageError(f"Failed to read source file for copying: {exc}")

        key = self._generate_s3_key(filename, subfolder)
        target_path = self.bucket_path / key
        target_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            shutil.copy2(str(source_p), str(target_path))
        except Exception as exc:
            raise StorageError(f"Failed to copy file to storage: {exc}")

        return key, target_path, checksum

    def get_absolute_path(self, key: str) -> Path:
        # Sanitize against path traversal attacks in key parameter
        clean_key = Path(key.lstrip("/\\"))
        full_path = (self.bucket_path / clean_key).resolve()
        if not str(full_path).startswith(str(self.bucket_path.resolve())):
            raise StorageError("Invalid storage key path traversal attempted.")
        return full_path

    def get_public_url(self, key: Optional[str]) -> Optional[str]:
        if not key:
            return None
        clean_key = str(key).replace("\\", "/").lstrip("/")
        return f"/files/{clean_key}"

    def read_bytes(self, key: str) -> bytes:
        target_path = self.get_absolute_path(key)
        if not target_path.exists():
            raise StorageError(f"File not found in storage: {key}")
        with open(target_path, "rb") as f:
            return f.read()

    def exists(self, key: str) -> bool:
        if not key:
            return False
        try:
            return self.get_absolute_path(key).exists()
        except Exception:
            return False

# Global instance
storage = LocalStorageAdapter()
