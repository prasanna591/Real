from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
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
    builder_follows: Mapped[list["CustomerBuilderFollow"]] = relationship(  # noqa: F821
        back_populates="user", cascade="all, delete-orphan"
    )


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

    followers: Mapped[list["CustomerBuilderFollow"]] = relationship(  # noqa: F821
        back_populates="builder", cascade="all, delete-orphan"
    )


class CustomerBuilderFollow(Base, TimestampMixin):
    """A customer following a builder — powers the social feed (Phase 2)."""

    __tablename__ = "customer_builder_follows"

    __table_args__ = (
        UniqueConstraint("user_id", "builder_id", name="uq_follow_user_builder"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("customer_users.id", ondelete="CASCADE"), index=True
    )
    builder_id: Mapped[int] = mapped_column(
        ForeignKey("builder_users.id", ondelete="CASCADE"), index=True
    )

    user: Mapped[CustomerUser] = relationship(back_populates="builder_follows")
    builder: Mapped[BuilderUser] = relationship(back_populates="followers")
