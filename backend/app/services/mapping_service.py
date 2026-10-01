"""
Backend 3D Mapping Service (Real Open3D, not stubbed).
Reconstructs surface micro-topography and exports real .ply and .obj meshes.
"""

import logging
from pathlib import Path
import numpy as np
from PIL import Image

logger = logging.getLogger("mapping_service")

def reconstruct_surface_mesh(image_path: str | Path, output_dir: Path, base_filename: str) -> dict:
    """
    Takes an uploaded RGB coating frame, runs Open3D reconstruction to compute surface
    roughness / topography, estimates normals, and performs Poisson Surface Reconstruction.
    Exports real .ply and .obj mesh files.
    """
    try:
        import open3d as o3d
    except ImportError as e:
        logger.warning(f"Open3D not installed or failed to import ({e}). Surface mapping skipped.")
        return {"success": False, "ply_path": None, "obj_path": None, "error": str(e)}

    try:
        img_path = Path(image_path)
        if not img_path.exists():
            raise FileNotFoundError(f"Source image not found: {image_path}")

        # Load RGB image and downsample for fast, stable 3D surface reconstruction
        pil_img = Image.open(str(img_path)).convert("RGB")
        max_dim = 256
        pil_img.thumbnail((max_dim, max_dim), Image.Resampling.BILINEAR)
        img_np = np.array(pil_img, dtype=np.float32) / 255.0
        h, w, _ = img_np.shape

        # Compute surface micro-relief: dark pits (pinholes) and scratches represent depth variations
        gray = 0.2989 * img_np[:, :, 0] + 0.5870 * img_np[:, :, 1] + 0.1140 * img_np[:, :, 2]
        gy, gx = np.gradient(gray)
        roughness = np.sqrt(gx**2 + gy**2)
        # Depth relief: depressions for darker pits and scratch edges
        z_height = (1.0 - gray) * 0.15 + roughness * 0.05

        # Create 3D grid
        x_coords = np.linspace(-1.0, 1.0, w)
        y_coords = np.linspace(-1.0 * (h / w), 1.0 * (h / w), h)
        xx, yy = np.meshgrid(x_coords, y_coords)

        points = np.stack([xx.flatten(), yy.flatten(), z_height.flatten()], axis=1)
        colors = img_np.reshape(-1, 3)

        pcd = o3d.geometry.PointCloud()
        pcd.points = o3d.utility.Vector3dVector(points)
        pcd.colors = o3d.utility.Vector3dVector(colors)

        # Downsample point cloud for Poisson solver stability
        pcd = pcd.voxel_down_sample(voxel_size=0.015)

        # Estimate surface normals
        pcd.estimate_normals(search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=0.1, max_nn=30))
        pcd.orient_normals_towards_camera_location(camera_location=np.array([0.0, 0.0, 5.0]))

        # Poisson surface reconstruction
        mesh, _ = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(pcd, depth=7)

        # Crop mesh to point cloud bounds to remove extraneous outer hulls
        bbox = pcd.get_axis_aligned_bounding_box()
        bbox.scale(1.15, bbox.get_center())
        mesh = mesh.crop(bbox)
        mesh.compute_vertex_normals()

        output_dir.mkdir(parents=True, exist_ok=True)
        ply_file = output_dir / f"{base_filename}.ply"
        obj_file = output_dir / f"{base_filename}.obj"

        o3d.io.write_triangle_mesh(str(ply_file), mesh, write_ascii=False)
        o3d.io.write_triangle_mesh(str(obj_file), mesh, write_ascii=True)

        return {
            "success": True,
            "ply_path": str(ply_file),
            "obj_path": str(obj_file),
            "vertex_count": len(mesh.vertices),
            "triangle_count": len(mesh.triangles),
            "error": None
        }

    except Exception as exc:
        logger.error(f"3D reconstruction failed safely: {exc}", exc_info=True)
        return {
            "success": False,
            "ply_path": None,
            "obj_path": None,
            "vertex_count": 0,
            "triangle_count": 0,
            "error": str(exc)
        }
