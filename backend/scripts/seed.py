"""Seed the database with a demo project, tower, floors and units."""

import sys
from datetime import date
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.models import Floor, MediaAsset, Project, Tower, Unit  # noqa: E402

FACINGS = ["East", "West", "North-East", "South-West"]


def seed() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        project = Project(
            name="Aurora Skyline",
            slug="aurora-skyline",
            description=(
                "Premium waterfront residences with panoramic views, curated amenities "
                "and smart-home living in the heart of the city."
            ),
            property_type="waterfront",
            city="Chennai",
            locality="ECR, Sholinganallur",
            starting_price=Decimal("12500000"),
            possession_date=date(2027, 12, 1),
            amenities=["pool", "gym", "clubhouse", "park", "parking", "kids_play_area"],
            status="active",
        )
        db.add(project)
        db.flush()

        media = [
            (
                "photo",
                "Facade render",
                "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1600&auto=format&fit=crop",
            ),
            (
                "capture_360",
                "Living room 360",
                "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1600&auto=format&fit=crop",
            ),
            (
                "photo",
                "Master bedroom",
                "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1600&auto=format&fit=crop",
            ),
            (
                "floor_plan",
                "3BHK floor plan",
                "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop",
            ),
            (
                "model_3d",
                "Aurora Skyline 3D walkthrough",
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1600&auto=format&fit=crop",
            ),
        ]
        for media_type, title, url in media:
            db.add(MediaAsset(project_id=project.id, media_type=media_type, title=title, url=url))

        tower = Tower(project_id=project.id, name="Tower A")
        db.add(tower)
        db.flush()

        for floor_number in range(1, 6):
            floor = Floor(tower_id=tower.id, number=floor_number)
            db.add(floor)
            db.flush()
            for i, (bhk, area, base_price) in enumerate(
                [(2, 1150, Decimal("12500000")), (3, 1650, Decimal("18900000"))]
            ):
                db.add(
                    Unit(
                        floor_id=floor.id,
                        unit_number=f"A{floor_number}0{i + 1}",
                        bhk=bhk,
                        area_sqft=area,
                        facing=FACINGS[i % len(FACINGS)],
                        price=base_price + Decimal(floor_number * 150000),
                        status="sold" if (floor_number == 1 and i == 0) else "available",
                    )
                )

        db.commit()
        print(f"Seeded project '{project.name}' ({project.slug}) with Tower A, 5 floors, 10 units.")


if __name__ == "__main__":
    seed()
