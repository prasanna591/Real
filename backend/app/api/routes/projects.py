import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_builder
from app.core.config import get_settings
from app.core.database import get_db
from app.core.uploads import read_upload, validate_upload
from app.models import BuilderRole, BuilderUser, Floor, MediaAsset, MediaType, Project, TourViewpoint, Tower, Unit
from app.schemas import (
    FloorCreate,
    FloorRead,
    FloorUpdate,
    MediaAssetCreate,
    MediaAssetRead,
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
    TourConfig,
    TourViewpointCreate,
    TourViewpointRead,
    TourViewpointUpdate,
    TowerCreate,
    TowerRead,
    TowerUpdate,
    UnitCreate,
    UnitRead,
    UnitUpdate,
)

router = APIRouter(prefix="/projects", tags=["projects"])


def _get_project_or_404(db: Session, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


def _get_owned_project_or_404(db: Session, project_id: int, builder: BuilderUser) -> Project:
    """Fetch a project the builder owns (or an admin can manage), else 404.

    Returns 404 rather than 403 so callers can't distinguish other builders'
    projects from nonexistent ones.
    """
    project = _get_project_or_404(db, project_id)
    if builder.role != BuilderRole.ADMIN and project.builder_id != builder.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


def _attach_cover_url(db: Session, projects: list[Project]) -> None:
    """Batched cover-image lookup (avoids an N+1 per project card on mobile)."""
    if not projects:
        return
    rows = db.execute(
        select(MediaAsset.project_id, MediaAsset.url)
        .where(MediaAsset.project_id.in_([p.id for p in projects]))
        .where(MediaAsset.media_type == MediaType.PHOTO)
        .order_by(MediaAsset.id)
    ).all()
    first_by_project: dict[int, str] = {}
    for project_id, url in rows:
        first_by_project.setdefault(project_id, url)
    for project in projects:
        project.cover_url = first_by_project.get(project.id)


@router.get("", response_model=list[ProjectRead])
def list_projects(
    property_type: str | None = Query(None),
    city: str | None = Query(None),
    status: str | None = Query(None),
    sort: str = Query("recent"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(Project).where(Project.status != "draft").options(joinedload(Project.builder))
    if property_type:
        stmt = stmt.where(Project.property_type == property_type)
    if city:
        stmt = stmt.where(func.lower(Project.city) == city.lower())
    if status:
        stmt = stmt.where(Project.status == status)
    else:
        stmt = stmt.where(Project.status == "active")

    if sort == "views":
        stmt = stmt.order_by(Project.view_count.desc(), Project.created_at.desc())
    elif sort == "saves":
        stmt = stmt.order_by(Project.save_count.desc(), Project.created_at.desc())
    elif sort == "trending":
        stmt = stmt.order_by(
            (Project.view_count + Project.save_count).desc(), Project.created_at.desc()
        )
    else:
        stmt = stmt.order_by(Project.created_at.desc())
    projects = list(db.scalars(stmt.limit(limit).offset(offset)))
    _attach_cover_url(db, projects)
    return projects


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    if db.scalar(select(Project).where(Project.slug == payload.slug)):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Slug '{payload.slug}' already exists")
    project = Project(**payload.model_dump(), builder_id=builder.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = (
        db.scalars(select(Project).where(Project.id == project_id).options(joinedload(Project.builder)))
        .unique()
        .one_or_none()
    )
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    # Social-proof tracking: bump views on detail opens. The client's separate
    # `view` analytics event feeds the builder funnel; this counter powers the
    # public feed's "🔥 trending" ordering. Atomic read-modify-write to avoid
    # lost increments under concurrent requests.
    db.execute(update(Project).where(Project.id == project_id).values(view_count=Project.view_count + 1))
    db.commit()
    db.refresh(project)
    _attach_cover_url(db, [project])
    return project


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    project = _get_owned_project_or_404(db, project_id, builder)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    project = _get_owned_project_or_404(db, project_id, builder)
    db.delete(project)
    db.commit()


# --- Towers ---
@router.get("/{project_id}/towers", response_model=list[TowerRead])
def list_towers(project_id: int, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    return list(db.scalars(select(Tower).where(Tower.project_id == project_id).order_by(Tower.name)))


@router.post("/{project_id}/towers", response_model=TowerRead, status_code=status.HTTP_201_CREATED)
def create_tower(project_id: int, payload: TowerCreate, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    _get_owned_project_or_404(db, project_id, builder)
    tower = Tower(project_id=project_id, **payload.model_dump())
    db.add(tower)
    db.commit()
    db.refresh(tower)
    return tower


def _get_tower_or_404(db: Session, project_id: int, tower_id: int) -> Tower:
    tower = db.get(Tower, tower_id)
    if not tower or tower.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tower not found")
    return tower


@router.patch("/{project_id}/towers/{tower_id}", response_model=TowerRead)
def update_tower(project_id: int, tower_id: int, payload: TowerUpdate, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    _get_owned_project_or_404(db, project_id, builder)
    tower = _get_tower_or_404(db, project_id, tower_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tower, field, value)
    db.commit()
    db.refresh(tower)
    return tower


@router.delete("/{project_id}/towers/{tower_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tower(project_id: int, tower_id: int, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    _get_owned_project_or_404(db, project_id, builder)
    tower = _get_tower_or_404(db, project_id, tower_id)
    db.delete(tower)  # cascades to floors and units
    db.commit()


@router.get("/{project_id}/towers/{tower_id}/floors", response_model=list[FloorRead])
def list_floors(project_id: int, tower_id: int, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    tower = db.get(Tower, tower_id)
    if not tower or tower.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tower not found")
    return list(db.scalars(select(Floor).where(Floor.tower_id == tower_id).order_by(Floor.number)))


@router.post("/{project_id}/towers/{tower_id}/floors", response_model=FloorRead, status_code=status.HTTP_201_CREATED)
def create_floor(project_id: int, tower_id: int, payload: FloorCreate, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    _get_owned_project_or_404(db, project_id, builder)
    tower = db.get(Tower, tower_id)
    if not tower or tower.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tower not found")
    floor = Floor(tower_id=tower_id, **payload.model_dump())
    db.add(floor)
    db.commit()
    db.refresh(floor)
    return floor


def _get_floor_or_404(db: Session, project_id: int, tower_id: int, floor_id: int) -> Floor:
    floor = db.get(Floor, floor_id)
    if not floor or floor.tower_id != tower_id or floor.tower.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Floor not found under this tower/project")
    return floor


@router.patch("/{project_id}/towers/{tower_id}/floors/{floor_id}", response_model=FloorRead)
def update_floor(project_id: int, tower_id: int, floor_id: int, payload: FloorUpdate, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    _get_owned_project_or_404(db, project_id, builder)
    floor = _get_floor_or_404(db, project_id, tower_id, floor_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(floor, field, value)
    db.commit()
    db.refresh(floor)
    return floor


@router.delete("/{project_id}/towers/{tower_id}/floors/{floor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_floor(project_id: int, tower_id: int, floor_id: int, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    _get_owned_project_or_404(db, project_id, builder)
    floor = _get_floor_or_404(db, project_id, tower_id, floor_id)
    db.delete(floor)  # cascades to units
    db.commit()


# --- Units ---
@router.get("/{project_id}/units", response_model=list[UnitRead])
def list_units(
    project_id: int,
    status: str | None = Query(None),
    min_bhk: int | None = Query(None),
    max_price: float | None = Query(None),
    floor_id: int | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    _get_project_or_404(db, project_id)
    stmt = (
        select(Unit)
        .join(Floor)
        .join(Tower)
        .where(Tower.project_id == project_id)
        .options(joinedload(Unit.floor))
        .order_by(Tower.name, Floor.number, Unit.unit_number)
    )
    if status:
        stmt = stmt.where(Unit.status == status)
    if min_bhk is not None:
        stmt = stmt.where(Unit.bhk >= min_bhk)
    if max_price is not None:
        stmt = stmt.where(Unit.price <= max_price)
    if floor_id is not None:
        stmt = stmt.where(Unit.floor_id == floor_id)
    return list(db.scalars(stmt.limit(limit).offset(offset)))


@router.get("/{project_id}/units/{unit_id}", response_model=UnitRead)
def get_unit(project_id: int, unit_id: int, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    unit = db.get(Unit, unit_id)
    if not unit or unit.floor.tower.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unit not found")
    return unit


@router.post("/{project_id}/towers/{tower_id}/floors/{floor_id}/units", response_model=UnitRead, status_code=status.HTTP_201_CREATED)
def create_unit(project_id: int, tower_id: int, floor_id: int, payload: UnitCreate, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    _get_owned_project_or_404(db, project_id, builder)
    floor = db.get(Floor, floor_id)
    if not floor or floor.tower_id != tower_id or floor.tower.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Floor not found under this tower/project")
    unit = Unit(floor_id=floor_id, **payload.model_dump())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.patch("/{project_id}/units/{unit_id}", response_model=UnitRead)
def update_unit(project_id: int, unit_id: int, payload: UnitUpdate, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    _get_owned_project_or_404(db, project_id, builder)
    unit = db.get(Unit, unit_id)
    if not unit or unit.floor.tower.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unit not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(unit, field, value)
    db.commit()
    db.refresh(unit)
    return unit


@router.delete("/{project_id}/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit(project_id: int, unit_id: int, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    _get_owned_project_or_404(db, project_id, builder)
    unit = db.get(Unit, unit_id)
    if not unit or unit.floor.tower.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unit not found")
    db.delete(unit)
    db.commit()


# --- 3D tour ---
@router.get("/{project_id}/tour", response_model=TourConfig)
def get_tour_config(project_id: int, db: Session = Depends(get_db)):
    """Resolved walkthrough payload: registered model_3d asset + ordered viewpoints."""
    _get_project_or_404(db, project_id)
    model_assets = list(
        db.scalars(
            select(MediaAsset)
            .where(MediaAsset.project_id == project_id)
            .where(MediaAsset.media_type == MediaType.MODEL_3D)
            .order_by(MediaAsset.id)
        )
    )
    # Prefer an actual model file over a placeholder/render of the same type.
    model_asset = next(
        (m for m in model_assets if m.url.lower().endswith((".glb", ".gltf"))),
        model_assets[0] if model_assets else None,
    )
    viewpoints = list(
        db.scalars(
            select(TourViewpoint)
            .where(TourViewpoint.project_id == project_id)
            .order_by(TourViewpoint.position, TourViewpoint.id)
        )
    )
    return TourConfig(project_id=project_id, model_url=model_asset.url if model_asset else None, viewpoints=viewpoints)


def _get_viewpoint_or_404(db: Session, project_id: int, viewpoint_id: int) -> TourViewpoint:
    viewpoint = db.get(TourViewpoint, viewpoint_id)
    if not viewpoint or viewpoint.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tour viewpoint not found")
    return viewpoint


@router.get("/{project_id}/tour/viewpoints", response_model=list[TourViewpointRead])
def list_viewpoints(project_id: int, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    return list(
        db.scalars(
            select(TourViewpoint)
            .where(TourViewpoint.project_id == project_id)
            .order_by(TourViewpoint.position, TourViewpoint.id)
        )
    )


@router.post("/{project_id}/tour/viewpoints", response_model=TourViewpointRead, status_code=status.HTTP_201_CREATED)
def create_viewpoint(project_id: int, payload: TourViewpointCreate, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    _get_owned_project_or_404(db, project_id, builder)
    viewpoint = TourViewpoint(project_id=project_id, **payload.model_dump())
    db.add(viewpoint)
    db.commit()
    db.refresh(viewpoint)
    return viewpoint


@router.patch("/{project_id}/tour/viewpoints/{viewpoint_id}", response_model=TourViewpointRead)
def update_viewpoint(project_id: int, viewpoint_id: int, payload: TourViewpointUpdate, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    _get_owned_project_or_404(db, project_id, builder)
    viewpoint = _get_viewpoint_or_404(db, project_id, viewpoint_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(viewpoint, field, value)
    db.commit()
    db.refresh(viewpoint)
    return viewpoint


@router.delete("/{project_id}/tour/viewpoints/{viewpoint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_viewpoint(project_id: int, viewpoint_id: int, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    _get_owned_project_or_404(db, project_id, builder)
    viewpoint = _get_viewpoint_or_404(db, project_id, viewpoint_id)
    db.delete(viewpoint)
    db.commit()


# --- Media assets ---
@router.get("/{project_id}/media", response_model=list[MediaAssetRead])
def list_media(project_id: int, media_type: str | None = Query(None), db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    stmt = select(MediaAsset).where(MediaAsset.project_id == project_id)
    if media_type:
        stmt = stmt.where(MediaAsset.media_type == media_type)
    return list(db.scalars(stmt))


@router.post("/{project_id}/media", response_model=MediaAssetRead, status_code=status.HTTP_201_CREATED)
def create_media(project_id: int, payload: MediaAssetCreate, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    _get_owned_project_or_404(db, project_id, builder)
    asset = MediaAsset(project_id=project_id, **payload.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.post("/{project_id}/media/upload", response_model=MediaAssetRead, status_code=status.HTTP_201_CREATED)
def upload_media(
    project_id: int,
    file: UploadFile = File(...),
    media_type: str = Form("photo"),
    title: str = Form(""),
    db: Session = Depends(get_db),
    builder: BuilderUser = Depends(get_current_builder),
):
    """Upload a media file and register it as a media asset on the project.

    Stores the file on local disk under the configured media dir (served under
    /media). When PUBLIC_BASE_URL is set, the returned URL uses it so files can
    be reached from physical devices on the LAN.
    """
    _get_owned_project_or_404(db, project_id, builder)

    try:
        media_type_enum = MediaType(media_type)
    except ValueError:
        type_map = MediaType.__members__
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Invalid media_type. Use: {sorted(t.value for t in type_map.values())}",
        ) from None

    try:
        content = read_upload(file)
        ext = validate_upload(file.content_type, file.filename)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from None

    settings = get_settings()
    uploads_dir = settings.media_dir / "project-media"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    filename = f"p{project_id}-{uuid.uuid4().hex}{ext}"
    (uploads_dir / filename).write_bytes(content)

    relative = f"project-media/{filename}"
    url = f"{settings.public_base_url}/media/{relative}" if settings.public_base_url else f"/media/{relative}"

    asset = MediaAsset(
        project_id=project_id,
        media_type=media_type_enum,
        title=title or filename,
        url=url,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{project_id}/media/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(project_id: int, asset_id: int, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    _get_owned_project_or_404(db, project_id, builder)
    asset = db.get(MediaAsset, asset_id)
    if not asset or asset.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Media asset not found")
    db.delete(asset)
    db.commit()
