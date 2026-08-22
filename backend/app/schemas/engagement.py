from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.engagement import EnquiryStatus, VisitStatus


class CustomerUserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=8, max_length=20)
    email: str = ""


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


class SiteVisitCreate(BaseModel):
    project_id: int
    unit_id: Optional[int] = None
    enquiry_id: Optional[int] = None
    visitor_name: str = Field(min_length=1, max_length=120)
    visitor_phone: str = Field(min_length=8, max_length=20)
    scheduled_at: datetime


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


class AnalyticsEventCreate(BaseModel):
    event_type: str = Field(pattern="^(view|walkthrough_complete|save|unsave|enquiry|site_visit_booked|booking)$")
    project_id: int
    unit_id: Optional[int] = None
    session_id: str = ""


class AnalyticsSummary(BaseModel):
    property_views: int
    serious_explorers: int
    saves: int
    enquiries: int
    site_visits: int
