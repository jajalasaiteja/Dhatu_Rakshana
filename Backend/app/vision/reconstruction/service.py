"""Open3D Surface Micro-Topography Reconstruction Service for Naval Coatings."""

import logging
from pathlib import Path
from typing import List, Union, Dict, Any, Optional
import numpy as np
from PIL import Image

from app.core.config import settings
from app.core.exceptions import ReconstructionError

logger = logging.getLogger("dhatu_rakshana.reconstruction")

def reconstruct_surface_mesh(
    image_paths: Union[str, Path, List[Union[str, Path]]],
    output_dir: Path,
    base_filename: str = "surface_mesh",
    max_dimension: Optional[int] = None
) -> Dict[str, Any]:
    """
    Computes micro-topography depth variation (corrosion peaks, scratch depressions, blister elevation),
    and reconstructs a 3D surface mesh using Open3D with surface normals and vertex colors.
    Exports binary .ply format mesh file.
    """
    try:
        import open3d as o3d
    except ImportError as e:
        logger.warning(f"Open3D not installed or failed to import ({e}). Surface mapping skipped.")
        return {"success": False, "ply_path": None, "error": str(e)}

    try:
        # Standardize input to list of existing Path objects
        if isinstance(image_paths, (list, tuple)):
            paths = [Path(p) for p in image_paths if Path(p).exists()]
        else:
            p = Path(image_paths)
            paths = [p] if p.exists() else []

        if not paths:
            raise ReconstructionError("No valid source image files found for 3D reconstruction.")

        max_dim = max_dimension or settings.RECONSTRUCTION_MAX_DIM
        num_images = len(paths)
        cols = min(num_images, 3)
        rows = (num_images + cols - 1) // cols

        all_points = []
        all_colors = []
        all_triangles = []
        vertex_offset = 0

        for idx, p in enumerate(paths):
            pil_img = Image.open(str(p)).convert("RGB")
            pil_img.thumbnail((max_dim, max_dim), Image.Resampling.BILINEAR)
            img_np = np.array(pil_img, dtype=np.float32) / 255.0
            h, w, _ = img_np.shape

            # Compute luminance & relief features
            gray = 0.2989 * img_np[:, :, 0] + 0.5870 * img_np[:, :, 1] + 0.1140 * img_np[:, :, 2]
            gy, gx = np.gradient(gray)
            roughness = np.sqrt(gx**2 + gy**2)

            # Corrosive rust peaks (red dominance over blue)
            rust_prominence = np.clip(img_np[:, :, 0] - img_np[:, :, 2], 0.0, 1.0)
            # Dark scratch valleys
            scratch_valleys = np.clip((0.35 - gray) * 2.0, 0.0, 1.0)

            # Combined micro-elevation profile
            z_height = (rust_prominence * 0.18) - (scratch_valleys * 0.15) + (roughness * 0.08)

            # Spatial arrangement across coordinate grid
            col_idx = idx % cols
            row_idx = idx // cols
            spacing_x = 2.4
            spacing_y = 2.4

            center_x = (col_idx - (cols - 1) / 2.0) * spacing_x
            center_y = - (row_idx - (rows - 1) / 2.0) * spacing_y

            aspect = h / w if w > 0 else 1.0
            x_coords = np.linspace(center_x - 1.0, center_x + 1.0, w)
            y_coords = np.linspace(center_y - 1.0 * aspect, center_y + 1.0 * aspect, h)
            xx, yy = np.meshgrid(x_coords, y_coords)

            pts = np.stack([xx.flatten(), yy.flatten(), z_height.flatten()], axis=1)
            cols_flat = img_np.reshape(-1, 3)

            all_points.append(pts)
            all_colors.append(cols_flat)

            # High-performance Vectorized Triangulation
            grid_i, grid_j = np.meshgrid(np.arange(h - 1), np.arange(w - 1), indexing='ij')
            v0 = vertex_offset + (grid_i * w + grid_j)
            v1 = v0 + 1
            v2 = v0 + w
            v3 = v2 + 1

            t1 = np.stack([v0, v1, v2], axis=-1).reshape(-1, 3)
            t2 = np.stack([v1, v3, v2], axis=-1).reshape(-1, 3)
            all_triangles.append(np.vstack([t1, t2]))

            vertex_offset += len(pts)

        # Merge all tiles into unified specimen mesh
        merged_points = np.vstack(all_points)
        merged_colors = np.vstack(all_colors)
        merged_triangles = np.vstack(all_triangles).astype(np.int32)

        mesh = o3d.geometry.TriangleMesh()
        mesh.vertices = o3d.utility.Vector3dVector(merged_points)
        mesh.vertex_colors = o3d.utility.Vector3dVector(merged_colors)
        mesh.triangles = o3d.utility.Vector3iVector(merged_triangles)
        mesh.compute_vertex_normals()

        output_dir.mkdir(parents=True, exist_ok=True)
        ply_file = output_dir / f"{base_filename}.ply"

        # Export binary PLY for Three.js PLYLoader
        o3d.io.write_triangle_mesh(str(ply_file), mesh, write_ascii=False)

        return {
            "success": True,
            "ply_path": str(ply_file),
            "vertex_count": len(mesh.vertices),
            "triangle_count": len(mesh.triangles),
            "images_processed": num_images,
            "error": None
        }

    except Exception as exc:
        logger.error(f"3D micro-topography reconstruction failed: {exc}", exc_info=True)
        return {
            "success": False,
            "ply_path": None,
            "vertex_count": 0,
            "triangle_count": 0,
            "error": str(exc)
        }
