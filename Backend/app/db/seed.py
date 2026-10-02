"""Database seeding utility to initialize naval platform zones, default inspector, and ML model records."""

from sqlmodel import Session, select
from datetime import datetime, timezone
import logging

from app.db.session import engine, init_db
from app.models.zone import Zone
from app.models.user import User
from app.models.model_version import ModelVersion
from app.core.security import hash_password

logger = logging.getLogger("dhatu_rakshana.seed")

DEFAULT_ZONES = [
    {
        "name": "Hull section 4",
        "asset_description": "Waterline anti-fouling primer & barrier coating subject to splash-zone cavitation"
    },
    {
        "name": "Deck plate 2",
        "asset_description": "Heavy-duty non-skid marine topcoat exposed to high-impact wheel load & salt spray"
    },
    {
        "name": "Ballast tank 1",
        "asset_description": "Confined compartment epoxy barrier protecting steel against corrosive salt ballast"
    },
    {
        "name": "Superstructure 1",
        "asset_description": "High-shear superstructure hydrodynamic flow surface with polyurethane finish"
    },
    {
        "name": "Keel Plate Alpha",
        "asset_description": "Bottom-most structural plate subject to benthic abrasion and cathodic protection monitoring"
    }
]

DEFAULT_MODELS = [
    {
        "name": "marine_hybrid_v1",
        "version": "1.5.0",
        "framework": "hybrid",
        "model_type": "yolo_plus_opencv_refinement",
        "confidence_threshold": 0.45,
        "is_active": True
    },
    {
        "name": "marine_classical_cv",
        "version": "1.2.0",
        "framework": "opencv",
        "model_type": "classical_cv",
        "confidence_threshold": 0.50,
        "is_active": True
    },
    {
        "name": "marine_yolo_v8",
        "version": "1.0.0",
        "framework": "ultralytics",
        "model_type": "yolov8",
        "confidence_threshold": 0.45,
        "is_active": True
    }
]

def seed_database():
    """Initializes tables and seeds platform zones, default inspector, and active models."""
    init_db()
    with Session(engine) as session:
        # 1. Seed Zones
        existing_zones = session.exec(select(Zone)).all()
        if not existing_zones:
            for z in DEFAULT_ZONES:
                session.add(Zone(name=z["name"], asset_description=z["asset_description"]))
            session.commit()
            logger.info(f"Seeded {len(DEFAULT_ZONES)} naval platform zones.")
        else:
            logger.info(f"Zones already present ({len(existing_zones)} zones found).")

        # 2. Seed Default Certified Inspector
        default_email = "inspector@navy.mil"
        existing_user = session.exec(select(User).where(User.email == default_email)).first()
        if not existing_user:
            default_inspector = User(
                username="inspector",
                email=default_email,
                password_hash=hash_password("password123"),
                full_name="Chief Inspector Sharma",
                role="inspector",
                is_active=True,
                created_at=datetime.now(timezone.utc)
            )
            session.add(default_inspector)
            session.commit()
            logger.info(f"Seeded default certified inspector: {default_email} (password: password123)")
        else:
            if not existing_user.username:
                existing_user.username = "inspector"
            existing_user.is_active = True
            session.add(existing_user)
            session.commit()
            logger.info(f"Default inspector already exists: {default_email}")

        # 3. Seed Model Versions
        existing_models = session.exec(select(ModelVersion)).all()
        if not existing_models:
            for m in DEFAULT_MODELS:
                session.add(ModelVersion(**m))
            session.commit()
            logger.info(f"Seeded {len(DEFAULT_MODELS)} AI model registry records.")
        else:
            logger.info(f"Model versions already present ({len(existing_models)} models found).")

if __name__ == "__main__":
    seed_database()
