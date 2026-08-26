"""Seed 3D-tour content (viewpoints + a loadable demo GLB) for demo projects.

Idempotent: only fills in what's missing. Safe to re-run.

Usage:
    python scripts/seed_tour.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session  # noqa: E402

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.models import MediaAsset, MediaType, Project, TourViewpoint  # noqa: E402

# Small, stable, publicly hosted GLB used to exercise the mobile loader.
# Builders replace this by registering their own scanned model via the dashboard.
DEMO_GLB_URL = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb"

DEMO_VIEWPOINTS = [
    {
        "name": "Living Room",
        "description": "9.5 ft ceilings · engineered oak flooring · floor-to-ceiling windows",
        "target_x": 0, "target_y": 1.2, "target_z": -1,
        "distance": 7, "yaw": 0, "pitch": 0.32, "position": 0,
    },
    {
        "name": "Master Bedroom",
        "description": "King-size layout · wardrobe wall · private balcony access",
        "target_x": -3.2, "target_y": 1.2, "target_z": -4.2,
        "distance": 5.5, "yaw": -0.55, "pitch": 0.3, "position": 1,
    },
    {
        "name": "Kitchen",
        "description": "Modular kitchen · granite counters · utility balcony",
        "target_x": 3.4, "target_y": 1.1, "target_z": -5.4,
        "distance": 5, "yaw": 0.6, "pitch": 0.34, "position": 2,
    },
]


def main() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        projects = list(db.query(Project).all())
        if not projects:
            print("No projects found — run scripts/seed.py first.")
            return

        for project in projects:
            has_model = (
                db.query(MediaAsset)
                .filter(MediaAsset.project_id == project.id)
                .filter(MediaAsset.media_type == MediaType.MODEL_3D)
                .order_by(MediaAsset.id)
                .first()
            )
            if not has_model:
                db.add(
                    MediaAsset(
                        project_id=project.id,
                        media_type=MediaType.MODEL_3D,
                        title=f"{project.name} walkthrough model (demo GLB)",
                        url=DEMO_GLB_URL,
                    )
                )
                print(f"+ registered demo GLB for {project.name}")
            elif not has_model.url.lower().split("?")[0].endswith(".glb"):
                has_model.url = DEMO_GLB_URL
                has_model.title = f"{project.name} walkthrough model (demo GLB)"
                print(f"• replaced non-GLB placeholder model on {project.name}")

            count = (
                db.query(TourViewpoint)
                .filter(TourViewpoint.project_id == project.id)
                .count()
            )
            if count == 0:
                for vp in DEMO_VIEWPOINTS:
                    db.add(TourViewpoint(project_id=project.id, **vp))
                print(f"+ added {len(DEMO_VIEWPOINTS)} viewpoints to {project.name}")
            else:
                print(f"• {project.name} already has {count} viewpoints")

        db.commit()
    print("Tour seeding complete.")


if __name__ == "__main__":
    main()
