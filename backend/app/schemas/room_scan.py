from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RoomScanCreate(BaseModel):
    client_scan_id: str = Field(min_length=1, max_length=80)
    name: str = Field(default="", max_length=200)
    keyframe_count: int = Field(0, ge=0)
    coverage_percent: float = Field(0, ge=0, le=100)
    duration_ms: int = Field(0, ge=0)
    thumbnail_url: str | None = Field(None, max_length=500)
    photo_urls: list[str] = []


class RoomScanRead(RoomScanCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    created_at: datetime
