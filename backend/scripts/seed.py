"""Seed the database with a full demo dataset.

Creates a builder account (for dashboard login), two projects with towers,
floors, units and media, plus sample engagement data: customers, saved items,
enquiries across the pipeline, site visits and analytics events.

WARNING: destructive. Drops all tables then recreates them. For local dev only.

Usage:
    python scripts/seed.py
"""

import sys
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import (  # noqa: E402
    AnalyticsEvent,
    BuilderRole,
    BuilderUser,
    CustomerUser,
    Enquiry,
    EnquiryNote,
    EnquiryStatus,
    EventType,
    Floor,
    MediaAsset,
    MediaType,
    Project,
    ProjectStatus,
    PropertyType,
    RoomScan,
    SavedItem,
    SiteVisit,
    TourViewpoint,
    Tower,
    Unit,
    VisitStatus,
)

FACINGS = ["East", "West", "North-East", "South-West"]

DEMO_BUILDER = {
    "name": "Demo Builder",
    "email": "demo@proptech.com",
    "password": "demo-builder-123",
}

# Small, stable, publicly hosted GLB used to exercise the mobile 3D tour loader.
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

UNSPLASH = {
    "facade": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1600&auto=format&fit=crop",
    "interior": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1600&auto=format&fit=crop",
    "bedroom": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1600&auto=format&fit=crop",
    "floor_plan": "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop",
    "lobby": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1600&auto=format&fit=crop",
    "living": "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=1600&auto=format&fit=crop",
    "kitchen": "https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=1600&auto=format&fit=crop",
    "balcony": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1600&auto=format&fit=crop",
}


def add_project(
    db,
    *,
    name: str,
    slug: str,
    description: str,
    property_type: str,
    city: str,
    locality: str,
    starting_price: Decimal,
    possession_date: date,
    amenities: list[str],
    builder_id: int,
    tower_names: list[str],
    floors_per_tower: int,
    seed_offset: int = 0,
) -> Project:
    project = Project(
        name=name,
        slug=slug,
        description=description,
        property_type=property_type,
        city=city,
        locality=locality,
        starting_price=starting_price,
        possession_date=possession_date,
        amenities=amenities,
        status=ProjectStatus.ACTIVE,
        builder_id=builder_id,
    )
    db.add(project)
    db.flush()

    media = [
        (MediaType.MODEL_3D, f"{name} 3D walkthrough", UNSPLASH["lobby"]),
        (MediaType.PHOTO, "Facade render", UNSPLASH["facade"]),
        (MediaType.CAPTURE_360, "Living room 360", UNSPLASH["interior"]),
        (MediaType.PHOTO, "Living room", UNSPLASH["living"]),
        (MediaType.PHOTO, "Kitchen", UNSPLASH["kitchen"]),
        (MediaType.PHOTO, "Balcony view", UNSPLASH["balcony"]),
        (MediaType.FLOOR_PLAN, "3BHK floor plan", UNSPLASH["floor_plan"]),
    ]
    for media_type, title, url in media:
        db.add(MediaAsset(project_id=project.id, media_type=media_type, title=title, url=url))

    # A loadable GLB walkthrough model (replaced by real scans in production)
    db.add(MediaAsset(
        project_id=project.id,
        media_type=MediaType.MODEL_3D,
        title=f"{name} walkthrough model (demo GLB)",
        url=DEMO_GLB_URL,
    ))

    # 3D tour viewpoints (camera stops for the mobile walkthrough)
    for vp in DEMO_VIEWPOINTS:
        db.add(TourViewpoint(project_id=project.id, **vp))

    for t_index, tower_name in enumerate(tower_names):
        tower = Tower(project_id=project.id, name=tower_name)
        db.add(tower)
        db.flush()
        for f_number in range(1, floors_per_tower + 1):
            floor = Floor(tower_id=tower.id, number=f_number)
            db.add(floor)
            db.flush()
            for u_index, (bhk, area, base_price) in enumerate(
                [(2, 1150, Decimal("12500000")), (3, 1650, Decimal("18900000")), (4, 2150, Decimal("26000000"))]
            ):
                before_units = u_index < 2
                sold = f_number == 1 and u_index == 0
                db.add(
                    Unit(
                        floor_id=floor.id,
                        unit_number=f"{tower_name.split()[-1]}{f_number}{u_index + 1 + seed_offset}",
                        bhk=bhk,
                        area_sqft=area,
                        facing=FACINGS[(u_index + seed_offset) % len(FACINGS)],
                        price=base_price + Decimal(int(f_number * 150000) + seed_offset * 90000),
                        status="sold" if sold else "booked" if before_units and f_number == 2 else "available",
                    )
                )

    return project


def seed() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        # --- Builder account (dashboard login) ---
        builder = BuilderUser(
            name=DEMO_BUILDER["name"],
            email=DEMO_BUILDER["email"],
            password_hash=hash_password(DEMO_BUILDER["password"]),
            role=BuilderRole.BUILDER,
        )
        db.add(builder)
        db.flush()

        # --- Projects ---
        aurora = add_project(
            db,
            name="Aurora Skyline",
            slug="aurora-skyline",
            description=(
                "Premium waterfront residences with panoramic views, curated amenities "
                "and smart-home living in the heart of the city."
            ),
            property_type=PropertyType.WATERFRONT.value,
            city="Chennai",
            locality="ECR, Sholinganallur",
            starting_price=Decimal("12500000"),
            possession_date=date(2027, 12, 1),
            amenities=["pool", "gym", "clubhouse", "park", "parking", "kids_play_area"],
            builder_id=builder.id,
            tower_names=["Tower A", "Tower B"],
            floors_per_tower=5,
        )

        zen = add_project(
            db,
            name="Zen Residences",
            slug="zen-residences",
            description=(
                "Serene premium villas surrounded by landscaped gardens, clubhouse and "
                "a wellness centre minutes from the city."
            ),
            property_type=PropertyType.VILLA.value,
            city="Pune",
            locality="Baner",
            starting_price=Decimal("28900000"),
            possession_date=date(2028, 6, 1),
            amenities=["clubhouse", "gym", "park", "walking_track", "24x7_security"],
            builder_id=builder.id,
            tower_names=["Villa Enclave"],
            floors_per_tower=3,
            seed_offset=7,
        )

        # --- Custommer + saved items (shortlist behaviour) ---
        customer = CustomerUser(name="Rahul Sharma", phone="+91 98400 12345", email="rahul@example.com")
        db.add(customer)
        db.flush()

        first_available_aurora = (
            db.query(Unit).filter(Unit.floor_id.in_([f.id for f in aurora.towers[0].floors])).filter(Unit.status == "available").first()
        )
        db.add(SavedItem(user_id=customer.id, project_id=aurora.id))
        if first_available_aurora:
            db.add(SavedItem(user_id=customer.id, unit_id=first_available_aurora.id))

        # --- Enquiries across the pipeline ---
        enquiries_defs = [
            ("Priya Menon", "+91 90000 11111", "priya@example.com", "Interested in a 3BHK with sea view. What is the maintenance?", EnquiryStatus.NEW),
            ("Arjun Nair", "+91 90000 22222", "arjun@example.com", "Please share the floor plan and possession timeline.", EnquiryStatus.CONTACTED),
            ("Sneha Iyer", "+91 90000 33333", "sneha@example.com", "Can I book a site visit this weekend?", EnquiryStatus.SITE_VISIT),
            ("Vikram Rao", "+91 90000 44444", "vikram@example.com", "Looking for a 4BHK. Any launch offers?", EnquiryStatus.QUALIFIED),
            ("Meera K", "+91 90000 55555", "meera@example.com", "Booked the 3BHK Tower A. Need payment schedule.", EnquiryStatus.BOOKED),
            ("Karthik S", "+91 90000 66666", "karthik@example.com", "Closed on unit A303. Thank you!", EnquiryStatus.CLOSED),
        ]
        units_aurora = db.query(Unit).filter(Unit.floor_id.in_([f.id for f in aurora.towers[0].floors])).all()
        for i, (name, phone, email, message, status) in enumerate(enquiries_defs):
            enquiry = Enquiry(
                project_id=aurora.id,
                unit_id=(units_aurora[i % len(units_aurora)].id) if units_aurora else None,
                name=name,
                phone=phone,
                email=email,
                message=message,
                status=status,
                created_at=datetime.now() - timedelta(days=len(enquiries_defs) - i, hours=3),
            )
            db.add(enquiry)
            db.flush()
            if status == EnquiryStatus.QUALIFIED:
                db.add(EnquiryNote(enquiry_id=enquiry.id, builder_id=builder.id, content="Customer wants a south-facing 4BHK. Sent brochure + pricing."))

        # --- Site visits ---
        db.add(SiteVisit(
            project_id=aurora.id,
            unit_id=units_aurora[2].id if len(units_aurora) > 2 else None,
            enquiry_id=2,
            visitor_name="Sneha Iyer",
            visitor_phone="+91 90000 33333",
            scheduled_at=datetime.now() + timedelta(days=2, hours=4),
            status=VisitStatus.SCHEDULED,
        ))
        db.add(SiteVisit(
            project_id=aurora.id,
            unit_id=units_aurora[4].id if len(units_aurora) > 4 else None,
            enquiry_id=5,
            visitor_name="Meera K",
            visitor_phone="+91 90000 55555",
            scheduled_at=datetime.now() - timedelta(days=1),
            status=VisitStatus.COMPLETED,
        ))
        db.add(SiteVisit(
            project_id=zen.id,
            visitor_name="Rohit Verma",
            visitor_phone="+91 90000 77777",
            scheduled_at=datetime.now() + timedelta(days=5),
            status=VisitStatus.SCHEDULED,
        ))

        # --- Analytics events (funnel data) ---
        def log_events(project: Project, multiplier: int) -> None:
            sessions = [f"seed-session-{project.id}-{n}" for n in range(5)]
            for _ in range(12 * multiplier):
                db.add(AnalyticsEvent(event_type=EventType.VIEW, project_id=project.id, session_id=sessions[0]))
            for s in sessions:
                db.add(AnalyticsEvent(event_type=EventType.WALKTHROUGH_COMPLETE, project_id=project.id, session_id=s))
            for _ in range(8 * multiplier):
                db.add(AnalyticsEvent(event_type=EventType.SAVE, project_id=project.id))
            for _ in range(2 * multiplier):
                db.add(AnalyticsEvent(event_type=EventType.SITE_VISIT_BOOKED, project_id=project.id))
            for _ in range(5 * multiplier):
                db.add(AnalyticsEvent(event_type=EventType.ASSISTANT_MESSAGE, project_id=project.id))

        log_events(aurora, 2)
        log_events(zen, 1)

        # --- A demo room-scan row owned by the project ---
        db.add(RoomScan(
            project_id=aurora.id,
            client_scan_id="demo-livA-alive",
            name="Demo living area scan",
            keyframe_count=2,
            photo_urls=[UNSPLASH["living"], UNSPLASH["kitchen"]],
            thumbnail_url=UNSPLASH["living"],
            coverage_percent=97.5,
            duration_ms=62400,
        ))

        db.commit()

        print("Seed complete.")
        print("Projects:  Aurora Skyline, Zen Residences (active)")
        print("Builder:   " + DEMO_BUILDER["email"] + " / " + DEMO_BUILDER["password"])
        print("Dashboard: http://localhost:3000  (login with the builder credentials above)")


if __name__ == "__main__":
    seed()
