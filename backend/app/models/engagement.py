import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, CheckConstraint, DateTime, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import StrEnum, TimestampMixin


class SavedItem(Base, TimestampMixin):
    """Shortlisted project or unit."""

    __tablename__ = "saved_items"

    __table_args__ = (
        CheckConstraint(
            "(project_id IS NULL AND unit_id IS NOT NULL) OR (project_id IS NOT NULL AND unit_id IS NULL)",
            name="ck_saved_item_single_target",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("customer_users.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("units.id", ondelete="CASCADE"), nullable=True)

    user: Mapped["CustomerUser"] = relationship(back_populates="saved_items")  # noqa: F821


# DB-level uniqueness scoped to one target (project OR unit) per user, so two
# concurrent save requests can't create duplicate shortlist rows.
Index(
    "uq_saved_items_user_scope",
    SavedItem.user_id,
    func.coalesce(SavedItem.project_id, SavedItem.unit_id),
    unique=True,
)


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
    SHARE = "share"


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
    # Optional referrer attribution for `share` events (no FK — append-only log
    # must survive the referrer's account being deleted).
    ref_user_id: Mapped[Optional[int]] = mapped_column(nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ListingRequestStatus(StrEnum):
    PENDING = "pending"
    CONTACTED = "contacted"
    ACTIVATED = "activated"
    REJECTED = "rejected"


class ListingRequest(Base, TimestampMixin):
    """A customer's request to list their property, awaiting builder review."""

    __tablename__ = "listing_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("customer_users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), index=True)
    email: Mapped[str] = mapped_column(String(200), default="")
    property_type: Mapped[str] = mapped_column(String(60), default="")
    bhk: Mapped[Optional[int]] = mapped_column(nullable=True)
    city: Mapped[str] = mapped_column(String(100), default="")
    locality: Mapped[str] = mapped_column(String(200), default="")
    expected_price: Mapped[str] = mapped_column(String(40), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    images: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[ListingRequestStatus] = mapped_column(
        Enum(ListingRequestStatus, native_enum=False),
        default=ListingRequestStatus.PENDING,
        index=True,
    )
