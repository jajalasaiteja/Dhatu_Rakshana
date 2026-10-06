"""Dedicated persistent storage and integrity validation service for 3D micro-topography PLY files.

Implements strict validation, path-traversal prevention, SHA-256 integrity calculation,
and atomic file operations under the configured TOPOLOGY_STORAGE_DIR.
"""

from pathlib import Path
from typing import Tuple, Dict, Any, Optional
import hashlib
import tempfile
import os
import shutil
import logging

from app.core.config import settings

logger = logging.getLogger("dhatu_rakshana.topology_storage")

class TopologyStorageService:
    """Manages persistent filesystem storage for 3D micro-topography PLY meshes."""

    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = Path(base_dir or settings.TOPOLOGY_STORAGE_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def validate_ply_content(self, data: bytes) -> Tuple[bool, Optional[str]]:
        """
        Validates that binary or text data is a genuine, well-formed PLY format file.
        Checks magic byte header, format specifier, vertex element declaration, and end_header.
        """
        if not data:
            return False, "PLY file payload is empty."

        if len(data) < 20:
            return False, "File is too small to be a valid PLY file."

        # Maximum allowed size: 150 MB
        max_size_bytes = 150 * 1024 * 1024
        if len(data) > max_size_bytes:
            return False, f"PLY file size exceeds maximum permitted limit ({len(data)} > {max_size_bytes} bytes)."

        # PLY header must begin with 'ply\n' or 'ply\r\n'
        if not (data.startswith(b"ply\n") or data.startswith(b"ply\r\n")):
            return False, "Invalid file format: Magic header 'ply' missing. Only .ply format is supported."

        # Search for end_header marker within first 4096 bytes
        header_sample = data[:4096].decode("latin1", errors="ignore")
        if "end_header" not in header_sample:
            return False, "Invalid PLY structure: 'end_header' tag missing in file header."

        if "format " not in header_sample:
            return False, "Invalid PLY structure: 'format' specification missing."

        if "element vertex" not in header_sample:
            return False, "Invalid PLY structure: 'element vertex' declaration missing."

        # Verify geometric parsability using Open3D if available
        try:
            import open3d as o3d
            with tempfile.NamedTemporaryFile(suffix=".ply", delete=False) as tmp:
                tmp.write(data)
                tmp_path = tmp.name

            try:
                # Try reading as triangle mesh or point cloud
                mesh = o3d.io.read_triangle_mesh(tmp_path)
                has_vertices = len(mesh.vertices) > 0
                if not has_vertices:
                    pcd = o3d.io.read_point_cloud(tmp_path)
                    has_vertices = len(pcd.points) > 0

                if not has_vertices:
                    return False, "PLY file contains 0 vertices or unreadable geometry."
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        except Exception as o3d_err:
            logger.debug(f"Open3D geometry inspection warning (file header is still valid): {o3d_err}")

        return True, None

    def get_safe_inspection_dir(self, inspection_id: int) -> Path:
        """
        Resolves the inspection topology directory, ensuring it remains strictly inside base_dir
        and preventing directory traversal attacks.
        """
        # Enforce integer ID representation to eliminate path traversal characters
        safe_id_str = str(int(inspection_id))
        target_dir = (self.base_dir / safe_id_str).resolve()

        # Strict boundary enforcement
        if not str(target_dir).startswith(str(self.base_dir)):
            raise ValueError(f"Path traversal detected: {target_dir} is outside {self.base_dir}")

        return target_dir

    def get_topology_file_path(self, inspection_id: int, filename: str = "topology.ply") -> Path:
        """Returns the safe canonical path for an inspection's PLY file."""
        insp_dir = self.get_safe_inspection_dir(inspection_id)
        # Always sanitize filename to constant safe name
        safe_filename = "topology.ply"
        file_path = (insp_dir / safe_filename).resolve()

        if not str(file_path).startswith(str(insp_dir)):
            raise ValueError(f"Path traversal detected: {file_path}")

        return file_path

    def calculate_sha256(self, data: bytes) -> str:
        """Calculates SHA-256 hexadecimal digest for binary data."""
        return hashlib.sha256(data).hexdigest()

    def calculate_file_sha256(self, file_path: Path) -> str:
        """Calculates SHA-256 hexadecimal digest for a file on disk."""
        h = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.hexdigest()

    def save_topology(
        self,
        inspection_id: int,
        data: bytes,
        original_filename: str = "topology.ply"
    ) -> Dict[str, Any]:
        """
        Validates, hashes, and atomically persists a PLY topology file for an inspection.
        Returns metadata dictionary containing file_size, file_hash, storage_path, etc.
        """
        is_valid, error_msg = self.validate_ply_content(data)
        if not is_valid:
            logger.warning(f"Topology integrity validation failed for inspection {inspection_id}: {error_msg}")
            raise ValueError(f"Invalid PLY file: {error_msg}")

        file_hash = self.calculate_sha256(data)
        file_size = len(data)

        insp_dir = self.get_safe_inspection_dir(inspection_id)
        insp_dir.mkdir(parents=True, exist_ok=True)

        final_path = self.get_topology_file_path(inspection_id)

        # Atomic write via temporary file in the same directory to avoid partial writes
        temp_file = insp_dir / f".tmp_{os.getpid()}_{os.urandom(4).hex()}.ply"
        try:
            with open(temp_file, "wb") as f:
                f.write(data)
                f.flush()
                os.fsync(f.fileno())
            os.replace(temp_file, final_path)
        except Exception:
            if temp_file.exists():
                temp_file.unlink(missing_ok=True)
            raise

        # Relative storage path for clean portable DB storage
        rel_storage_path = f"storage/topology/{int(inspection_id)}/topology.ply"

        logger.info(
            f"Topology stored successfully for inspection {inspection_id}: "
            f"size={file_size} bytes, sha256={file_hash}"
        )

        return {
            "inspection_id": inspection_id,
            "original_filename": Path(original_filename).name or "topology.ply",
            "stored_filename": "topology.ply",
            "storage_path": rel_storage_path,
            "absolute_path": final_path,
            "file_size": file_size,
            "file_hash": file_hash,
        }

    def save_from_file_path(
        self,
        inspection_id: int,
        src_path: Path,
        original_filename: str = "topology.ply"
    ) -> Dict[str, Any]:
        """Reads and persists an existing file on disk into the managed topology storage."""
        src_path = Path(src_path).resolve()
        if not src_path.exists():
            raise FileNotFoundError(f"Source PLY file not found: {src_path}")

        with open(src_path, "rb") as f:
            data = f.read()

        return self.save_topology(
            inspection_id=inspection_id,
            data=data,
            original_filename=original_filename or src_path.name
        )

    def get_topology_file(self, inspection_id: int) -> Tuple[Optional[Path], Optional[str]]:
        """Returns the existing file path and SHA-256 for an inspection's topology, if it exists."""
        file_path = self.get_topology_file_path(inspection_id)
        if not file_path.is_file():
            return None, None
        return file_path, self.calculate_file_sha256(file_path)

    def delete_topology(self, inspection_id: int) -> bool:
        """Removes the physical PLY file and inspection directory."""
        try:
            insp_dir = self.get_safe_inspection_dir(inspection_id)
            if insp_dir.exists():
                shutil.rmtree(insp_dir, ignore_errors=True)
                logger.info(f"Topology storage directory removed for inspection {inspection_id}")
                return True
            return False
        except Exception as exc:
            logger.error(f"Failed to delete topology for inspection {inspection_id}: {exc}")
            return False

    def verify_integrity(self, inspection_id: int, expected_hash: str) -> bool:
        """Verifies the stored file matches the expected SHA-256 hash."""
        file_path = self.get_topology_file_path(inspection_id)
        if not file_path.is_file():
            logger.warning(f"Topology integrity check failed: file missing at {file_path}")
            return False
        current_hash = self.calculate_file_sha256(file_path)
        is_match = (current_hash.lower() == expected_hash.lower())
        if not is_match:
            logger.warning(
                f"Topology integrity validation failed for inspection {inspection_id}: "
                f"expected {expected_hash}, got {current_hash}"
            )
        return is_match

# Singleton service instance
topology_storage = TopologyStorageService()
