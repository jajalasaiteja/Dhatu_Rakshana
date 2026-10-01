"""
Synthetic Data Generator for Defense Marine Platform Coating Defects.
Generates procedural defect images, YOLOv8 format labels, and metadata.csv.
"""

import os
import random
import csv
import argparse
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SUBTYPES = ["pinhole", "scratch", "inclusion", "contamination", "dust_particle", "no_defect"]

# Typical marine platform coating palettes: primer red, battleship grey, hull navy, zinc chromate
BASE_PALETTES = [
    (115, 125, 132),   # Naval Battleship Grey
    (140, 50, 40),     # Red Lead / Epoxy Primer
    (35, 55, 75),      # Navy Hull Dark Blue
    (90, 105, 95),     # Zinc Chromate Marine Green
    (160, 165, 170),   # Light Grey Superstructure Topcoat
]

def generate_textured_hull_background(width: int = 640, height: int = 640) -> Image.Image:
    base_color = random.choice(BASE_PALETTES)
    
    # 1. Base gradient
    base_arr = np.zeros((height, width, 3), dtype=np.uint8)
    for c in range(3):
        gradient = np.linspace(-15, 15, height)[:, None] + np.linspace(-15, 15, width)[None, :]
        channel_val = np.clip(base_color[c] + gradient, 0, 255).astype(np.uint8)
        base_arr[:, :, c] = channel_val

    # 2. Add realistic surface micro-roughness / salt texture noise
    noise = np.random.normal(0, 12, (height, width, 3)).astype(np.int16)
    noisy_arr = np.clip(base_arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(noisy_arr, mode="RGB")
    draw = ImageDraw.Draw(img)

    # 3. Occasional weld seam or steel plate joint line (25% chance)
    if random.random() < 0.35:
        seam_y = random.randint(int(height * 0.2), int(height * 0.8))
        draw.line([(0, seam_y), (width, seam_y)], fill=(max(0, base_color[0] - 30), max(0, base_color[1] - 30), max(0, base_color[2] - 30)), width=3)
        draw.line([(0, seam_y + 2), (width, seam_y + 2)], fill=(min(255, base_color[0] + 35), min(255, base_color[1] + 35), min(255, base_color[2] + 35)), width=1)

    return img

def add_pinhole_defect(draw: ImageDraw.ImageDraw, img_w: int, img_h: int) -> tuple[int, list[float]]:
    # Pinhole / holiday: localized dark pits with subtle lighter halos
    cx = random.randint(int(img_w * 0.15), int(img_w * 0.85))
    cy = random.randint(int(img_h * 0.15), int(img_h * 0.85))
    radius = random.randint(6, 18)
    
    # Halo
    draw.ellipse([cx - radius - 3, cy - radius - 3, cx + radius + 3, cy + radius + 3], outline=(200, 200, 200), width=1)
    # Pit
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=(15, 15, 20), outline=(5, 5, 10))

    # Bounding box [xmin, ymin, xmax, ymax]
    bbox = [max(0, cx - radius - 5), max(0, cy - radius - 5), min(img_w, cx + radius + 5), min(img_h, cy + radius + 5)]
    return 0, bbox  # Class 0: defect

def add_scratch_defect(draw: ImageDraw.ImageDraw, img_w: int, img_h: int) -> tuple[int, list[float]]:
    # Gouge or scratch: jagged multi-segment line exposing underlying steel/primer
    start_x = random.randint(int(img_w * 0.15), int(img_w * 0.7))
    start_y = random.randint(int(img_h * 0.15), int(img_h * 0.7))
    
    points = [(start_x, start_y)]
    curr_x, curr_y = start_x, start_y
    segments = random.randint(3, 6)
    
    for _ in range(segments):
        curr_x += random.randint(15, 45)
        curr_y += random.randint(-15, 35)
        points.append((curr_x, curr_y))

    # Draw dark groove and bright edge
    draw.line(points, fill=(20, 20, 25), width=random.randint(4, 7))
    highlight_points = [(p[0] + 1, p[1] + 1) for p in points]
    draw.line(highlight_points, fill=(230, 235, 240), width=2)

    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    bbox = [max(0, min(xs) - 8), max(0, min(ys) - 8), min(img_w, max(xs) + 8), min(img_h, max(ys) + 8)]
    return 0, bbox  # Class 0: defect

def add_inclusion_defect(draw: ImageDraw.ImageDraw, img_w: int, img_h: int) -> tuple[int, list[float]]:
    # Embedded foreign material, slag, or paint blister
    cx = random.randint(int(img_w * 0.15), int(img_w * 0.85))
    cy = random.randint(int(img_h * 0.15), int(img_h * 0.85))
    rx = random.randint(12, 32)
    ry = random.randint(10, 28)

    # Multi-layered irregular blob
    draw.ellipse([cx - rx - 4, cy - ry - 4, cx + rx + 4, cy + ry + 4], fill=(60, 45, 30))
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(25, 20, 15), outline=(180, 140, 90))

    bbox = [max(0, cx - rx - 8), max(0, cy - ry - 8), min(img_w, cx + rx + 8), min(img_h, cy + ry + 8)]
    return 0, bbox  # Class 0: defect

def add_contamination_defect(draw: ImageDraw.ImageDraw, img: Image.Image, img_w: int, img_h: int) -> tuple[int, list[float]]:
    # Oil/chemical stain or salt spray deposit
    cx = random.randint(int(img_w * 0.15), int(img_w * 0.75))
    cy = random.randint(int(img_h * 0.15), int(img_h * 0.75))
    rw = random.randint(30, 70)
    rh = random.randint(25, 60)

    # Translucent polygon overlay
    overlay = Image.new("RGBA", (img_w, img_h), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    stain_color = (random.randint(40, 70), random.randint(35, 55), random.randint(20, 40), 160)
    num_pts = random.randint(6, 10)
    angles = np.linspace(0, 2 * np.pi, num_pts, endpoint=False)
    pts = []
    for a in angles:
        r = random.uniform(0.7, 1.2)
        px = cx + rw * r * np.cos(a)
        py = cy + rh * r * np.sin(a)
        pts.append((px, py))
    overlay_draw.polygon(pts, fill=stain_color)
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=3))
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"))

    bbox = [max(0, cx - rw - 10), max(0, cy - rh - 10), min(img_w, cx + rw + 10), min(img_h, cy + rh + 10)]
    return 0, bbox  # Class 0: defect

def add_particle_defect(draw: ImageDraw.ImageDraw, img_w: int, img_h: int) -> tuple[int, list[float]]:
    # Class 1: dust or blast particles (small cluster)
    cx = random.randint(int(img_w * 0.15), int(img_w * 0.85))
    cy = random.randint(int(img_h * 0.15), int(img_h * 0.85))
    cluster_radius = random.randint(10, 25)

    num_specks = random.randint(5, 12)
    speck_coords = []
    for _ in range(num_specks):
        sx = cx + random.randint(-cluster_radius, cluster_radius)
        sy = cy + random.randint(-cluster_radius, cluster_radius)
        r = random.randint(1, 3)
        draw.ellipse([sx - r, sy - r, sx + r, sy + r], fill=(240, 240, 245), outline=(50, 50, 50))
        speck_coords.extend([sx, sy])

    bbox = [
        max(0, cx - cluster_radius - 6),
        max(0, cy - cluster_radius - 6),
        min(img_w, cx + cluster_radius + 6),
        min(img_h, cy + cluster_radius + 6)
    ]
    return 1, bbox  # Class 1: particle

def bbox_to_yolo(bbox: list[float], img_w: int, img_h: int) -> tuple[float, float, float, float]:
    xmin, ymin, xmax, ymax = bbox
    bw = xmax - xmin
    bh = ymax - ymin
    xc = xmin + bw / 2.0
    yc = ymin + bh / 2.0
    return round(xc / img_w, 6), round(yc / img_h, 6), round(bw / img_w, 6), round(bh / img_h, 6)

def generate_samples(count: int = 15, output_dir: str | Path = "ml/dataset"):
    out_path = Path(output_dir)
    images_dir = out_path / "images"
    labels_dir = out_path / "labels"
    images_dir.mkdir(parents=True, exist_ok=True)
    labels_dir.mkdir(parents=True, exist_ok=True)

    metadata_path = out_path / "metadata.csv"
    img_w, img_h = 640, 640

    records = []

    print(f"Generating {count} synthetic marine coating defect samples...")
    for idx in range(count):
        # Pick subtype cyclically or randomly
        subtype = SUBTYPES[idx % len(SUBTYPES)]
        img = generate_textured_hull_background(img_w, img_h)
        draw = ImageDraw.Draw(img)

        cls_id = None
        bbox = None

        if subtype == "pinhole":
            cls_id, bbox = add_pinhole_defect(draw, img_w, img_h)
        elif subtype == "scratch":
            cls_id, bbox = add_scratch_defect(draw, img_w, img_h)
        elif subtype == "inclusion":
            cls_id, bbox = add_inclusion_defect(draw, img_w, img_h)
        elif subtype == "contamination":
            cls_id, bbox = add_contamination_defect(draw, img, img_w, img_h)
        elif subtype == "dust_particle":
            cls_id, bbox = add_particle_defect(draw, img_w, img_h)
        elif subtype == "no_defect":
            cls_id = None
            bbox = None

        base_filename = f"marine_scan_{idx+1:03d}_{subtype}"
        img_filename = f"{base_filename}.png"
        label_filename = f"{base_filename}.txt"

        # Save image
        img.save(images_dir / img_filename)

        # Save YOLO label file
        yolo_lines = []
        area_pct = 0.0
        expected_verdict = "PASS"

        if bbox is not None and cls_id is not None:
            xc, yc, nw, nh = bbox_to_yolo(bbox, img_w, img_h)
            yolo_lines.append(f"{cls_id} {xc} {yc} {nw} {nh}")
            area_pct = round(nw * nh * 100.0, 3)
            
            # Simple expectation mapping
            if subtype in ["scratch", "contamination", "inclusion"] and area_pct > 2.0:
                expected_verdict = "FAIL"
            elif area_pct > 0.8:
                expected_verdict = "REVIEW"
            else:
                expected_verdict = "PASS"

        (labels_dir / label_filename).write_text("\n".join(yolo_lines), encoding="utf-8")

        records.append({
            "filename": img_filename,
            "class": "defect" if cls_id == 0 else ("particle" if cls_id == 1 else "clean"),
            "subtype": subtype,
            "area_pct": area_pct,
            "expected_verdict": expected_verdict
        })
        print(f"  [+] Created {img_filename} ({subtype}, area={area_pct}%, verdict={expected_verdict})")

    # Write metadata.csv
    with open(metadata_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["filename", "class", "subtype", "area_pct", "expected_verdict"])
        writer.writeheader()
        writer.writerows(records)

    print(f"\nSynthetic dataset generation complete! ({count} images saved to {images_dir})")
    print(f"Metadata index written to {metadata_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Synthetic marine coating defect generator.")
    parser.add_argument("--count", type=int, default=15, help="Number of sample images to generate")
    parser.add_argument("--output-dir", type=str, default="ml/dataset", help="Output directory")
    args = parser.parse_args()
    generate_samples(args.count, args.output_dir)
