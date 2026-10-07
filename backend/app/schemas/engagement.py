import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.engagement import EnquiryStatus, VisitStatus

_PHONE_RE = re.compile(r"^\+?[\d\s\-()]{7,20}$")
_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


class CustomerUserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=8, max_length=20)
    email: str = ""

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not _PHONE_RE.match(v):
            raise ValueError("Invalid phone number format")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip()
        if v and not _EMAIL_RE.match(v):
            raise ValueError("Invalid email format")
        return v


class CustomerUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
    email: str


class SavedItemCreate(BaseModel):
    user_id: int
    project_id: Optional[int] = None
    unit_id: Optional[int] = None

    def validated(self) -> "SavedItemCreate":
        if self.project_id is None and self.unit_id is None:
            raise ValueError("Either project_id or unit_id is required")
        return self


class SavedItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    project_id: Optional[int]
    unit_id: Optional[int]


class EnquiryCreate(BaseModel):
    project_id: int
    unit_id: Optional[int] = None
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=8, max_length=20)
    email: str = ""
    message: str = ""

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not _PHONE_RE.match(v):
            raise ValueError("Invalid phone number format")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip()
        if v and not _EMAIL_RE.match(v):
            raise ValueError("Invalid email format")
        return v

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        return v.strip()[:2000]


class EnquiryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    unit_id: Optional[int]
    name: str
    phone: str
    email: str
    message: str
    status: EnquiryStatus
    created_at: datetime


class EnquiryStatusUpdate(BaseModel):
    status: EnquiryStatus


class MyEnquiryRead(BaseModel):
    """Customer-facing view of one of their enquiries (looked up by phone)."""

    id: int
    project_id: int
    project_name: str
    unit_id: Optional[int]
    status: EnquiryStatus
    created_at: datetime


class SiteVisitCreate(BaseModel):
    project_id: int
    unit_id: Optional[int] = None
    enquiry_id: Optional[int] = None
    visitor_name: str = Field(min_length=1, max_length=120)
    visitor_phone: str = Field(min_length=8, max_length=20)
    scheduled_at: datetime

    @field_validator("visitor_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not _PHONE_RE.match(v):
            raise ValueError("Invalid phone number format")
        return v

    @field_validator("visitor_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        return v


class SiteVisitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    unit_id: Optional[int]
    enquiry_id: Optional[int]
    visitor_name: str
    visitor_phone: str
    scheduled_at: datetime
    status: VisitStatus


class SiteVisitUpdate(BaseModel):
    status: Optional[VisitStatus] = None
    scheduled_at: Optional[datetime] = None


class AnalyticsEventCreate(BaseModel):
    event_type: str = Field(pattern="^(view|walkthrough_complete|save|unsave|enquiry|site_visit_booked|booking|assistant_message|share)$")
    project_id: int
    unit_id: Optional[int] = None
    session_id: str = ""
    ref_user_id: Optional[int] = None


class AnalyticsSummary(BaseModel):
    property_views: int
    serious_explorers: int
    saves: int
    enquiries: int
    site_visits: int
    assistant_messages: int = 0
    shares: int = 0


class EnquiryNoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        return v.strip()


class EnquiryNoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    enquiry_id: int
    builder_id: int
    content: str
    created_at: datetime


class ListingRequestCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=8, max_length=20)
    email: str = ""
    property_type: str = Field(default="", max_length=60)
    bhk: Optional[int] = Field(default=None, ge=1, le=10)
    city: str = Field(default="", max_length=100)
    locality: str = Field(default="", max_length=200)
    expected_price: str = Field(default="", max_length=40)
    description: str = Field(default="", max_length=2000)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not _PHONE_RE.match(v):
            raise ValueError("Invalid phone number format")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip()
        if v and not _EMAIL_RE.match(v):
            raise ValueError("Invalid email format")
        return v


class ListingRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int]
    name: str
    phone: str
    email: str
    property_type: str
    bhk: Optional[int]
    city: str
    locality: str
    expected_price: str
    description: str
    images: list[str]
    status: str
    created_at: datetime
