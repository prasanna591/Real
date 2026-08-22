from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import StrEnum, TimestampMixin


class CustomerUser(Base, TimestampMixin):
    __tablename__ = "customer_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(200), default="")

    saved_items: Mapped[list["SavedItem"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # noqa: F821


class BuilderRole(StrEnum):
    BUILDER = "builder"
    ADMIN = "admin"


class BuilderUser(Base, TimestampMixin):
    """Builder/admin account used to authenticate dashboard and write endpoints."""

    __tablename__ = "builder_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[BuilderRole] = mapped_column(
        Enum(BuilderRole, native_enum=False), default=BuilderRole.BUILDER
    )
