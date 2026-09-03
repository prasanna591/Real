"""Room-scan sync endpoints.

The mobile app captures a room scan, then uploads the accepted keyframe photos
along with scan metadata. Photos are stored on local disk (served under /media)
so the feature works without S3; swap in the S3 presign flow for production.
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models import Project, RoomScan
from app.schemas.room_scan import RoomScanRead

router = APIRouter(prefix="/room-scans", tags=["room-scans"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _media_dir():
    root = get_settings().media_dir
    root.mkdir(parents=True, exist_ok=True)
    scans_dir = root / "room-scans"
    scans_dir.mkdir(parents=True, exist_ok=True)
    return scans_dir


def _public_url(relative_path: str) -> str:
    settings = get_settings()
    if settings.public_base_url:
        return f"{settings.public_base_url}/media/{relative_path}"
    return f"/media/{relative_path}"


@router.post("", response_model=RoomScanRead, status_code=status.HTTP_201_CREATED)
async def create_room_scan(
    project_id: int = Form(...),
    client_scan_id: str = Form(...),
    name: str = Form(""),
    keyframe_count: int = Form(0),
    coverage_percent: float = Form(0),
    duration_ms: int = Form(0),
    thumbnail: UploadFile | None = File(None),
    photos: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    existing = db.scalar(select(RoomScan).where(RoomScan.client_scan_id == client_scan_id))
    if existing:
        return existing

    scans_dir = _media_dir()
    photo_urls: list[str] = []
    thumbnail_url: str | None = None

    def save_photo(file: UploadFile, frame_id: str) -> str:
        content = file.file.read()
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unsupported image type: {file.content_type}")
        ext = "jpg" if file.content_type == "image/jpeg" else ("png" if file.content_type == "image/png" else "webp")
        relative = f"{frame_id}.{ext}"
        (scans_dir / relative).write_bytes(content)
        return _public_url(f"room-scans/{relative}")

    for idx, file in enumerate(photos):
        photo_urls.append(save_photo(file, f"{client_scan_id}_{idx}"))

    if thumbnail is not None and thumbnail.filename:
        thumbnail_url = save_photo(thumbnail, f"{client_scan_id}_thumb")

    scan = RoomScan(
        project_id=project_id,
        client_scan_id=client_scan_id,
        name=name,
        keyframe_count=len(photo_urls),
        coverage_percent=coverage_percent,
        duration_ms=duration_ms,
        thumbnail_url=thumbnail_url,
        photo_urls=photo_urls,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


@router.get("", response_model=list[RoomScanRead])
def list_room_scans(
    project_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(RoomScan).order_by(RoomScan.created_at.desc())
    if project_id is not None:
        stmt = stmt.where(RoomScan.project_id == project_id)
    return list(db.scalars(stmt))
