import os
import uuid
from datetime import datetime
from pathlib import Path
import shutil
from backend.app.config import STORAGE_DIR

class StorageAdapter:
    """Local filesystem storage adapter structured to mimic AWS S3 bucket/key paths."""

    def __init__(self, base_dir: Path = STORAGE_DIR, bucket_name: str = "marine-inspections"):
        self.base_dir = Path(base_dir)
        self.bucket_name = bucket_name
        self.bucket_path = self.base_dir / "buckets" / self.bucket_name
        self.bucket_path.mkdir(parents=True, exist_ok=True)

    def _generate_s3_key(self, filename: str, subfolder: str = "images") -> str:
        now = datetime.utcnow()
        clean_name = Path(filename).name.replace(" ", "_")
        unique_prefix = uuid.uuid4().hex[:8]
        return f"{subfolder}/{now.year:04d}/{now.month:02d}/{now.day:02d}/{unique_prefix}_{clean_name}"

    def save_bytes(self, file_bytes: bytes, filename: str, subfolder: str = "images") -> tuple[str, Path]:
        key = self._generate_s3_key(filename, subfolder)
        target_path = self.bucket_path / key
        target_path.parent.mkdir(parents=True, exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(file_bytes)
        return key, target_path

    def save_file_from_path(self, source_path: Path, filename: str, subfolder: str = "meshes") -> tuple[str, Path]:
        key = self._generate_s3_key(filename, subfolder)
        target_path = self.bucket_path / key
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(str(source_path), str(target_path))
        return key, target_path

    def get_absolute_path(self, key: str) -> Path:
        return self.bucket_path / key

    def get_public_url(self, key: str) -> str:
        # Key served via FastAPI static mount /files/{key}
        clean_key = key.replace("\\", "/")
        return f"/files/{clean_key}"

storage = StorageAdapter()
