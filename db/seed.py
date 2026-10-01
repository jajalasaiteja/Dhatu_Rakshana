"""Seed script to populate initial naval marine defense platform zones and default inspector."""

import hashlib
from sqlmodel import Session, select
from db.db import engine, init_db
from db.models import Zone, User

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
    }
]

def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def seed_database():
    init_db()
    with Session(engine) as session:
        # Seed zones
        existing_zones = session.exec(select(Zone)).all()
        if not existing_zones:
            for z_data in DEFAULT_ZONES:
                zone = Zone(name=z_data["name"], asset_description=z_data["asset_description"])
                session.add(zone)
            session.commit()
            print(f"[Seed] Successfully seeded {len(DEFAULT_ZONES)} naval defense platform zones.")
        else:
            print(f"[Seed] Database already contains {len(existing_zones)} zones.")

        # Seed default inspector user
        default_email = "inspector@navy.mil"
        existing_user = session.exec(select(User).where(User.email == default_email)).first()
        if not existing_user:
            default_inspector = User(
                email=default_email,
                password_hash=hash_pw("password123"),
                full_name="Chief Inspector Sharma",
                role="inspector"
            )
            session.add(default_inspector)
            session.commit()
            print(f"[Seed] Seeded default inspector user: {default_email} (password: password123)")
        else:
            print(f"[Seed] Default inspector already exists: {default_email}")

def seed_zones():
    seed_database()

if __name__ == "__main__":
    seed_database()
