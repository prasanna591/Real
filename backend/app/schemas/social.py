from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.project import ProjectRead


class FollowCreate(BaseModel):
    user_id: int
    builder_id: int


class BuilderCard(BaseModel):
    """Public builder profile summary for suggestions/following/feed headers."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    project_count: int = 0
    follower_count: int = 0


class FollowRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    builder_id: int


class FeedItem(BaseModel):
    """A single social-feed entry; each maps to a project from a followed builder."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    kind: str
    builder_id: int
    builder_name: str
    headline: str
    sub: str
    created_at: datetime
    project: ProjectRead


class FeedResponse(BaseModel):
    mode: str  # "following" | "discover"
    items: list[FeedItem]