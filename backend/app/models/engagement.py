import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import StrEnum, TimestampMixin


class SavedItem(Base, TimestampMixin):
    """Shortlisted project or unit."""

    __tablename__ = "saved_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("customer_users.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("units.id", ondelete="CASCADE"), nullable=True)

    user: Mapped["CustomerUser"] = relationship(back_populates="saved_items")  # noqa: F821


class EnquiryStatus(StrEnum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    SITE_VISIT = "site_visit"
    BOOKED = "booked"
    CLOSED = "closed"


class Enquiry(Base, TimestampMixin):
    __tablename__ = "enquiries"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("units.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), index=True)
    email: Mapped[str] = mapped_column(String(200), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[EnquiryStatus] = mapped_column(
        Enum(EnquiryStatus, native_enum=False), default=EnquiryStatus.NEW, index=True
    )

    notes: Mapped[list["EnquiryNote"]] = relationship(back_populates="enquiry", cascade="all, delete-orphan")


class VisitStatus(StrEnum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SiteVisit(Base, TimestampMixin):
    __tablename__ = "site_visits"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("units.id", ondelete="SET NULL"))
    enquiry_id: Mapped[Optional[int]] = mapped_column(ForeignKey("enquiries.id", ondelete="SET NULL"))
    visitor_name: Mapped[str] = mapped_column(String(120))
    visitor_phone: Mapped[str] = mapped_column(String(20))
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=False))
    status: Mapped[VisitStatus] = mapped_column(
        Enum(VisitStatus, native_enum=False), default=VisitStatus.SCHEDULED, index=True
    )


class EventType(StrEnum):
    VIEW = "view"
    WALKTHROUGH_COMPLETE = "walkthrough_complete"
    SAVE = "save"
    UNSAVE = "unsave"
    ENQUIRY = "enquiry"
    SITE_VISIT_BOOKED = "site_visit_booked"
    BOOKING = "booking"
    ASSISTANT_MESSAGE = "assistant_message"


class EnquiryNote(Base, TimestampMixin):
    """Internal note/comment on an enquiry by the builder sales team."""

    __tablename__ = "enquiry_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    enquiry_id: Mapped[int] = mapped_column(ForeignKey("enquiries.id", ondelete="CASCADE"), index=True)
    builder_id: Mapped[int] = mapped_column(ForeignKey("builder_users.id", ondelete="CASCADE"), index=True)
    content: Mapped[str] = mapped_column(Text)

    enquiry: Mapped["Enquiry"] = relationship(back_populates="notes")


class AnalyticsEvent(Base):
    """Append-only event log powering the builder analytics dashboard."""

    __tablename__ = "analytics_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_type: Mapped[EventType] = mapped_column(Enum(EventType, native_enum=False), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    unit_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )
    session_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
