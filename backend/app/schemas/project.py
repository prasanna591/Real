from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.media import MediaType
from app.models.project import ProjectStatus, PropertyType, UnitStatus


# --- Projects ---
class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    property_type: PropertyType = PropertyType.LUXURY_APARTMENT
    city: str = Field(min_length=1, max_length=100)
    locality: str = ""
    starting_price: Optional[Decimal] = None
    possession_date: Optional[date] = None
    amenities: list[str] = []
    status: ProjectStatus = ProjectStatus.DRAFT


class ProjectCreate(ProjectBase):
    slug: str = Field(min_length=1, max_length=220, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    property_type: Optional[PropertyType] = None
    city: Optional[str] = None
    locality: Optional[str] = None
    starting_price: Optional[Decimal] = None
    possession_date: Optional[date] = None
    amenities: Optional[list[str]] = None
    status: Optional[ProjectStatus] = None


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    created_at: datetime
    save_count: int = 0
    view_count: int = 0
    builder_id: Optional[int] = None
    builder_name: Optional[str] = None
    cover_url: Optional[str] = None


class TowerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class TowerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)


class TowerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str


class FloorCreate(BaseModel):
    number: int = Field(ge=0)


class FloorUpdate(BaseModel):
    number: Optional[int] = Field(None, ge=0)


class FloorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tower_id: int
    number: int


# --- Units ---
class UnitBase(BaseModel):
    unit_number: str = Field(min_length=1, max_length=20)
    bhk: int = Field(ge=1, le=10)
    area_sqft: float = Field(gt=0)
    facing: str = ""
    price: Decimal = Field(gt=0)
    status: UnitStatus = UnitStatus.AVAILABLE


class UnitCreate(UnitBase):
    pass


class UnitUpdate(BaseModel):
    bhk: Optional[int] = None
    area_sqft: Optional[float] = None
    facing: Optional[str] = None
    price: Optional[Decimal] = None
    status: Optional[UnitStatus] = None


class UnitRead(UnitBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    floor_id: int


# --- 3D tour ---
class TourViewpointCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=300)
    target_x: float = 0
    target_y: float = Field(1.2, ge=0, le=50)
    target_z: float = -1
    distance: float = Field(7, gt=0.5, le=100)
    yaw: float = Field(0, ge=-6.2832, le=6.2832)
    pitch: float = Field(0.32, ge=0.01, le=1.5)
    position: int = Field(0, ge=0)


class TourViewpointUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=80)
    description: Optional[str] = Field(None, max_length=300)
    target_x: Optional[float] = None
    target_y: Optional[float] = Field(None, ge=0, le=50)
    target_z: Optional[float] = None
    distance: Optional[float] = Field(None, gt=0.5, le=100)
    yaw: Optional[float] = Field(None, ge=-6.2832, le=6.2832)
    pitch: Optional[float] = Field(None, ge=0.01, le=1.5)
    position: Optional[int] = Field(None, ge=0)


class TourViewpointRead(TourViewpointCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int


class TourConfig(BaseModel):
    """Resolved walkthrough payload consumed by the mobile 3D tour screen."""

    project_id: int
    model_url: Optional[str] = None
    viewpoints: list[TourViewpointRead]


# --- Media ---
class MediaAssetCreate(BaseModel):
    media_type: MediaType
    title: str = ""
    url: str = Field(min_length=1, max_length=500)


class MediaAssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    media_type: MediaType
    title: str
    url: str
