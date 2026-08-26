import enum
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import JSON, Date, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import StrEnum, TimestampMixin
from app.core.database import Base


class PropertyType(StrEnum):
    LUXURY_APARTMENT = "luxury_apartment"
    VILLA = "villa"
    PREMIUM_RESIDENCE = "premium_residence"
    WATERFRONT = "waterfront"


class ProjectStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    SOLD_OUT = "sold_out"


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    property_type: Mapped[PropertyType] = mapped_column(
        Enum(PropertyType, native_enum=False), default=PropertyType.LUXURY_APARTMENT
    )
    city: Mapped[str] = mapped_column(String(100), index=True)
    locality: Mapped[str] = mapped_column(String(200), default="")
    starting_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    possession_date: Mapped[Optional[date]] = mapped_column(Date)
    amenities: Mapped[list] = mapped_column(JSON, default=list)  # ["pool", "gym", ...]
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, native_enum=False), default=ProjectStatus.DRAFT, index=True
    )
    builder_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("builder_users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    towers: Mapped[list["Tower"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    media: Mapped[list["MediaAsset"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Tower(Base, TimestampMixin):
    __tablename__ = "towers"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(50))

    project: Mapped[Project] = relationship(back_populates="towers")
    floors: Mapped[list["Floor"]] = relationship(back_populates="tower", cascade="all, delete-orphan")


class Floor(Base, TimestampMixin):
    __tablename__ = "floors"

    id: Mapped[int] = mapped_column(primary_key=True)
    tower_id: Mapped[int] = mapped_column(ForeignKey("towers.id", ondelete="CASCADE"), index=True)
    number: Mapped[int]

    tower: Mapped[Tower] = relationship(back_populates="floors")
    units: Mapped[list["Unit"]] = relationship(back_populates="floor", cascade="all, delete-orphan")


class UnitStatus(StrEnum):
    AVAILABLE = "available"
    BOOKED = "booked"
    SOLD = "sold"


class Unit(Base, TimestampMixin):
    __tablename__ = "units"

    id: Mapped[int] = mapped_column(primary_key=True)
    floor_id: Mapped[int] = mapped_column(ForeignKey("floors.id", ondelete="CASCADE"), index=True)
    unit_number: Mapped[str] = mapped_column(String(20))  # e.g. A101
    bhk: Mapped[int]
    area_sqft: Mapped[float]
    facing: Mapped[str] = mapped_column(String(30), default="")
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    status: Mapped[UnitStatus] = mapped_column(
        Enum(UnitStatus, native_enum=False), default=UnitStatus.AVAILABLE, index=True
    )

    floor: Mapped[Floor] = relationship(back_populates="units")


class TourViewpoint(Base, TimestampMixin):
    """Camera stop inside a project's 3D walkthrough (consumed by the mobile app)."""

    __tablename__ = "tour_viewpoints"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(String(300), default="")
    target_x: Mapped[float] = mapped_column(default=0)
    target_y: Mapped[float] = mapped_column(default=1.2)
    target_z: Mapped[float] = mapped_column(default=-1)
    distance: Mapped[float] = mapped_column(default=7)
    yaw: Mapped[float] = mapped_column(default=0)
    pitch: Mapped[float] = mapped_column(default=0.32)
    position: Mapped[int] = mapped_column(default=0)  # ordering within the tour
