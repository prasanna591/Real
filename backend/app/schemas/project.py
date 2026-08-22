import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

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


class TowerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class TowerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str


class FloorCreate(BaseModel):
    number: int = Field(ge=0)


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


# --- Media ---
class MediaType(str, enum.Enum):
    MODEL_3D = "model_3d"
    FLOOR_PLAN = "floor_plan"
    PHOTO = "photo"
    CAPTURE_360 = "capture_360"
    AR_PACK = "ar_pack"
    INTERIOR_SET = "interior_set"


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
