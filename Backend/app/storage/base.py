"""Abstract Storage Adapter interface for local filesystem and cloud object stores."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Tuple, Optional

class BaseStorageAdapter(ABC):
    @abstractmethod
    def save_bytes(self, file_bytes: bytes, filename: str, subfolder: str = "images") -> Tuple[str, Path, str]:
        """Saves byte content and returns (storage_key, absolute_path, sha256_checksum)."""
        pass

    @abstractmethod
    def save_file_from_path(self, source_path: Path, filename: str, subfolder: str = "meshes") -> Tuple[str, Path, str]:
        """Saves file from local path into storage bucket."""
        pass

    @abstractmethod
    def get_absolute_path(self, key: str) -> Path:
        """Resolves storage key to absolute filesystem path."""
        pass

    @abstractmethod
    def get_public_url(self, key: Optional[str]) -> Optional[str]:
        """Generates publicly accessible URL or static mount path."""
        pass

    @abstractmethod
    def read_bytes(self, key: str) -> bytes:
        """Reads binary content for a storage key."""
        pass

    @abstractmethod
    def exists(self, key: str) -> bool:
        """Checks if a storage key exists."""
        pass
