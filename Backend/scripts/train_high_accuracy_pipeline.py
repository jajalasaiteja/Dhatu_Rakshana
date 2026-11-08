"""
High-Accuracy Dual-Stage Retraining Pipeline for Dhatu Rakshana
Target Performance:
  - Stage 1 (YOLOv8m Defect Detector): >= 95.0% mAP@50
  - Stage 2 (ResNet34 Subtype Classifier): >= 98.0% Accuracy & >0.95 Macro-F1

Addresses:
  1. 31:1 Class Imbalance (Class-Balanced Focal Loss + WeightedRandomSampler)
  2. Pinhole vs Inclusion 2D Indistinguishability (Photometric Curvature & Sharpness Augmentations)
  3. Marine Contamination vs Wafer Speckles (Roboflow remapping + Marine salt/soot expansion)
"""

import os
import sys
import time
import math
import shutil
import random
import argparse
from pathlib import Path
from collections import Counter

import numpy as np
from PIL import Image

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
import torchvision
from torchvision import transforms as TF

# ==============================================================================
# 1. Class-Balanced Focal Loss Implementation
# ==============================================================================
class ClassBalancedFocalLoss(nn.Module):
    """
    Focal Loss with Class-Balanced effective-number weights:
      FL(p_t) = - alpha_t * (1 - p_t)^gamma * log(p_t)
    Prevents majority classes (inclusions) from overwhelming minority classes (pinholes).
    """
    def __init__(self, alpha=None, gamma=2.0, label_smoothing=0.05, reduction="mean"):
        super().__init__()
        self.alpha = alpha  # Precomputed tensor of shape (num_classes,)
        self.gamma = gamma
        self.label_smoothing = label_smoothing
        self.reduction = reduction

    def forward(self, inputs, targets):
        ce_loss = F.cross_entropy(
            inputs,
            targets,
            reduction="none",
            label_smoothing=self.label_smoothing
        )
        pt = torch.exp(-ce_loss)  # probability of true class
        focal_term = ((1.0 - pt) ** self.gamma)
        loss = focal_term * ce_loss

        if self.alpha is not None:
            alpha_t = self.alpha[targets]
            loss = alpha_t * loss

        if self.reduction == "mean":
            return loss.mean()
        elif self.reduction == "sum":
            return loss.sum()
        return loss

def compute_effective_num_weights(class_counts, num_classes, beta=0.999):
    """Computes Cui et al. (CVPR 2019) Class-Balanced loss weights based on effective number of samples."""
    effective_num = []
    for c in range(num_classes):
        n = class_counts.get(c, 1)
        eff = (1.0 - math.pow(beta, max(n, 1))) / (1.0 - beta)
        effective_num.append(1.0 / max(eff, 1e-6))
    effective_num = np.array(effective_num, dtype=np.float32)
    # Normalize weights so mean is 1.0
    normalized_weights = effective_num / effective_num.mean()
    return torch.tensor(normalized_weights, dtype=torch.float32)


# ==============================================================================
# 2. Stage 2 Subtype Dataset with Photometric Curvature Transforms
# ==============================================================================
class SubtypeCropDataset(Dataset):
    def __init__(self, items, transform=None):
        self.items = items
        self.transform = transform

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        path, label_idx = self.items[idx]
        with Image.open(path) as img:
            img = img.convert("RGB")
            if self.transform:
                img = self.transform(img)
            return img, label_idx

def get_stage2_transforms(img_size=224):
    """
    Transforms tailored for micrographic defect recognition:
      - RandomAdjustSharpness: Preserves boundary micro-shadows in cavitation pinholes.
      - Contrast & Brightness Jitter: Simulates varied subsea illumination and specular reflections.
    """
    train_tf = TF.Compose([
        TF.Resize((img_size, img_size)),
        TF.RandomHorizontalFlip(p=0.5),
        TF.RandomVerticalFlip(p=0.5),
        TF.RandomRotation(degrees=30),
        TF.RandomAdjustSharpness(sharpness_factor=2.0, p=0.5),
        TF.ColorJitter(brightness=0.25, contrast=0.3, saturation=0.2),
        TF.ToTensor(),
        TF.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    val_tf = TF.Compose([
        TF.Resize((img_size, img_size)),
        TF.ToTensor(),
        TF.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    return train_tf, val_tf


# ==============================================================================
# 3. Stage 1 YOLOv8 Training Routine (Target: >= 95% mAP50)
# ==============================================================================
def train_yolo_stage1(
    data_yaml_path: Path,
    output_dir: Path,
    epochs: int = 50,
    batch_size: int = 32,
    imgsz: int = 512,
    device=None,
    model_size: str = "yolov8m.pt"
):
    from ultralytics import YOLO

    if device is None:
        num_gpus = torch.cuda.device_count() if torch.cuda.is_available() else 0
        device = [0, 1] if num_gpus >= 2 else (0 if num_gpus == 1 else "cpu")

    print(f"\n=======================================================")
    print(f"STAGE 1: TRAINING YOLOV8 DETECTOR (Target: >= 95% mAP50)")
    print(f"Model: {model_size} | Epochs: {epochs} | Batch: {batch_size} | Device: {device}")
    print(f"=======================================================")

    yolo = YOLO(model_size)

    results = yolo.train(
        data=str(data_yaml_path.resolve()),
        epochs=epochs,
        batch=batch_size,
        imgsz=imgsz,
        device=device,
        project=str(output_dir / "runs_stage1"),
        name="yolov8_defect_run",
        patience=15,
        save=True,
        exist_ok=True,
        verbose=True,
        # High-Accuracy Hyperparameter Suite:
        cos_lr=True,             # Cosine learning rate scheduling
        close_mosaic=10,         # Disables mosaic during the last 10 epochs for crisp bounding box convergence
        scale=0.5,               # Multi-scale augmentation (resolves 5px pinholes to 300px scratches)
        mosaic=1.0,              # Full mosaic during initial feature learning
        mixup=0.15,              # Handles overlapping / co-occurring defects
        copy_paste=0.15,         # Defect instance copy-paste to maximize rare category density
        box=7.5,                 # Elevated bounding box loss weight for CIoU precision
        cls=0.5,                 # Defect presence class loss
        dfl=1.5,                 # Distribution Focal Loss for sub-pixel boundary localization
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=15.0,
        translate=0.1,
        fliplr=0.5,
        flipud=0.5,
    )

    val_device = 0 if (isinstance(device, list) or (isinstance(device, int) and device >= 0)) else "cpu"
    val_res = yolo.val(data=str(data_yaml_path.resolve()), imgsz=imgsz, split="val", device=val_device)

    best_pt = output_dir / "runs_stage1" / "yolov8_defect_run" / "weights" / "best.pt"
    dest_pt = output_dir / "yolo_detector.pt"
    if best_pt.exists():
        shutil.copy2(best_pt, dest_pt)
        print(f"Exported best Stage 1 detector to: {dest_pt}")

    map50 = float(val_res.box.map50)
    print(f"\n--- Stage 1 YOLOv8 Results ---")
    print(f"mAP@50    : {map50:.4f} ({map50*100:.2f}%)")
    print(f"Precision : {float(val_res.box.mp):.4f}")
    print(f"Recall    : {float(val_res.box.mr):.4f}")

    return dest_pt, map50


# ==============================================================================
# 4. Stage 2 ResNet Training Routine (Target: >= 98% Accuracy)
# ==============================================================================
def train_resnet_stage2(
    crops_dir: Path,
    output_dir: Path,
    epochs: int = 40,
    batch_size: int = 64,
    imgsz: int = 224,
    arch: str = "resnet34",
    num_workers: int = 4
):
    classes = ["contamination", "inclusion", "no_defect", "pinhole", "scratch"]
    c2i = {c: i for i, c in enumerate(classes)}

    train_tf, val_tf = get_stage2_transforms(img_size=imgsz)

    train_items = []
    val_items = []
    for c in classes:
        train_p = crops_dir / "train" / c
        val_p = crops_dir / "val" / c
        if train_p.exists():
            for f in train_p.glob("*.jpg"): train_items.append((f, c2i[c]))
            for f in train_p.glob("*.png"): train_items.append((f, c2i[c]))
        if val_p.exists():
            for f in val_p.glob("*.jpg"): val_items.append((f, c2i[c]))
            for f in val_p.glob("*.png"): val_items.append((f, c2i[c]))

    print(f"\n=======================================================")
    print(f"STAGE 2: TRAINING {arch.upper()} SUBTYPE CLASSIFIER (Target: >= 98% Accuracy)")
    print(f"Train Crops: {len(train_items)} | Val Crops: {len(val_items)}")
    print(f"=======================================================")

    train_labels = [y for _, y in train_items]
    class_counts = Counter(train_labels)
    for c, idx in c2i.items():
        print(f"  Class {idx} [{c:14s}]: {class_counts.get(idx, 0):5d} training crops")

    # 1. Balanced Sampling across all 5 classes
    sample_weights = [1.0 / max(class_counts.get(y, 1), 1) for y in train_labels]
    sampler = WeightedRandomSampler(weights=sample_weights, num_samples=len(sample_weights), replacement=True)

    train_loader = DataLoader(
        SubtypeCropDataset(train_items, train_tf),
        batch_size=batch_size,
        sampler=sampler,
        num_workers=num_workers,
        pin_memory=True
    )
    val_loader = DataLoader(
        SubtypeCropDataset(val_items, val_tf),
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True
    )

    # 2. Build Model Architecture
    num_gpus = torch.cuda.device_count() if torch.cuda.is_available() else 0
    device = torch.device("cuda:0" if num_gpus > 0 else "cpu")

    if arch == "resnet34":
        model = torchvision.models.resnet34(weights=torchvision.models.ResNet34_Weights.DEFAULT)
    elif arch == "resnet50":
        model = torchvision.models.resnet50(weights=torchvision.models.ResNet50_Weights.DEFAULT)
    else:
        model = torchvision.models.resnet18(weights=torchvision.models.ResNet18_Weights.DEFAULT)

    # Add dropout head to prevent overfitting on fine features
    in_feat = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(p=0.25),
        nn.Linear(in_feat, len(classes))
    )

    if num_gpus > 1:
        print(f"Multi-GPU DataParallel enabled across {num_gpus} devices.")
        model = nn.DataParallel(model)

    model.to(device)

    # 3. Class-Balanced Focal Loss
    cb_weights = compute_effective_num_weights(class_counts, len(classes), beta=0.999).to(device)
    loss_fn = ClassBalancedFocalLoss(alpha=cb_weights, gamma=2.0, label_smoothing=0.05)

    optimizer = torch.optim.AdamW(model.parameters(), lr=2.5e-4, weight_decay=1e-2)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, T_0=10, T_mult=2, eta_min=1e-6
    )
    scaler = torch.cuda.amp.GradScaler(enabled=(device.type == "cuda"))

    best_acc = 0.0
    best_f1 = 0.0
    best_conf = None
    best_weights_path = output_dir / "resnet_classifier.pt"

    t0 = time.time()
    for ep in range(1, epochs + 1):
        model.train()
        tot_loss, tot_corr, seen = 0.0, 0, 0

        for x, y in train_loader:
            x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
            optimizer.zero_grad()

            with torch.cuda.amp.autocast(enabled=(device.type == "cuda")):
                out = model(x)
                loss = loss_fn(out, y)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            tot_loss += loss.item() * len(y)
            tot_corr += (out.argmax(1) == y).sum().item()
            seen += len(y)

        scheduler.step()

        # Validation phase
        model.eval()
        yt, yp = [], []
        with torch.no_grad():
            for x, y in val_loader:
                x = x.to(device, non_blocking=True)
                with torch.cuda.amp.autocast(enabled=(device.type == "cuda")):
                    preds = model(x).argmax(1).cpu().tolist()
                yp.extend(preds)
                yt.extend(y.tolist())

        conf = np.zeros((len(classes), len(classes)), dtype=int)
        for t, p in zip(yt, yp):
            conf[t, p] += 1

        tp = np.diag(conf).astype(float)
        prec = tp / np.maximum(conf.sum(0), 1)
        rec = tp / np.maximum(conf.sum(1), 1)
        f1 = 2 * prec * rec / np.maximum(prec + rec, 1e-9)
        macro_f1 = float(f1.mean())
        acc = float(np.trace(conf) / max(conf.sum(), 1))

        mark = ""
        # Checkpoint if validation accuracy reaches new high or macro-F1 improves
        if (acc > best_acc) or (acc == best_acc and macro_f1 > best_f1):
            best_acc = acc
            best_f1 = macro_f1
            best_conf = conf
            mark = "  <- [NEW BEST]"

            state_dict = model.module.state_dict() if isinstance(model, nn.DataParallel) else model.state_dict()
            torch.save({
                "arch": arch,
                "classes": classes,
                "state_dict": state_dict,
                "imgsz": imgsz,
                "context": 2.2,
                "macro_f1": macro_f1,
                "accuracy": acc
            }, best_weights_path)

        print(f"Epoch {ep:>2}/{epochs} | Loss: {tot_loss/seen:.4f} | Val Acc: {acc*100:.2f}% | Macro-F1: {macro_f1:.4f}{mark}")

    total_time = time.time() - t0
    print(f"\nResNet Training Completed in {total_time/60:.1f} mins.")
    print(f"Peak Validation Accuracy: {best_acc*100:.2f}% | Best Macro-F1: {best_f1:.4f}")
    print(f"Model saved to: {best_weights_path}")

    return best_weights_path, best_acc, best_f1

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="High-Accuracy Dhatu Rakshana Training Pipeline")
    parser.add_argument("--data-yaml", type=str, default="data/coatingdet_tiled/data.yaml")
    parser.add_argument("--crops-dir", type=str, default="data/classifier_crops")
    parser.add_argument("--output-dir", type=str, default="models")
    parser.add_argument("--yolo-epochs", type=int, default=50)
    parser.add_argument("--resnet-epochs", type=int, default=40)
    parser.add_argument("--resnet-arch", type=str, default="resnet34", choices=["resnet18", "resnet34", "resnet50"])
    args = parser.parse_args()

    out_p = Path(args.output_dir)
    out_p.mkdir(parents=True, exist_ok=True)

    print("=== STARTING HIGH-ACCURACY DUAL-STAGE TRAINING ===")
    if Path(args.data_yaml).exists():
        train_yolo_stage1(Path(args.data_yaml), out_p, epochs=args.yolo_epochs)
    if Path(args.crops_dir).exists():
        train_resnet_stage2(Path(args.crops_dir), out_p, epochs=args.resnet_epochs, arch=args.resnet_arch)
