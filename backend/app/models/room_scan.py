from sqlalchemy import JSON, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class RoomScan(Base, TimestampMixin):
    """A builder room scan synced from the mobile app.

    Stores scan metadata plus the URLs of the accepted keyframe photos so the
    builder can review coverage on the dashboard.
    """

    __tablename__ = "room_scans"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    client_scan_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    keyframe_count: Mapped[int] = mapped_column(Integer, default=0)
    coverage_percent: Mapped[float] = mapped_column(Float, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    photo_urls: Mapped[list] = mapped_column(JSON, default=list)
