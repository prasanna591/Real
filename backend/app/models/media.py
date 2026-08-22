import enum

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import StrEnum, TimestampMixin


class MediaType(StrEnum):
    MODEL_3D = "model_3d"
    FLOOR_PLAN = "floor_plan"
    PHOTO = "photo"
    CAPTURE_360 = "capture_360"
    AR_PACK = "ar_pack"
    INTERIOR_SET = "interior_set"


class MediaAsset(Base, TimestampMixin):
    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    media_type: Mapped[MediaType] = mapped_column(Enum(MediaType, native_enum=False), index=True)
    title: Mapped[str] = mapped_column(String(200), default="")
    url: Mapped[str] = mapped_column(String(500))  # S3 / CDN URL

    project: Mapped["Project"] = relationship(back_populates="media")  # noqa: F821
