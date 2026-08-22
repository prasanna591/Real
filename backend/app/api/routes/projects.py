from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_builder
from app.core.database import get_db
from app.models import BuilderUser, Floor, MediaAsset, Project, Tower, Unit
from app.schemas import (
    FloorCreate,
    FloorRead,
    MediaAssetCreate,
    MediaAssetRead,
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
    TowerCreate,
    TowerRead,
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


@router.get("", response_model=list[ProjectRead])
def list_projects(
    property_type: str | None = Query(None),
    city: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
):
    stmt = select(Project).where(Project.status != "draft")
    if property_type:
        stmt = stmt.where(Project.property_type == property_type)
    if city:
        stmt = stmt.where(func.lower(Project.city) == city.lower())
    if status:
        stmt = stmt.where(Project.status == status)
    else:
        stmt = stmt.where(Project.status == "active")
    return list(db.scalars(stmt.order_by(Project.created_at.desc())))


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), _builder: BuilderUser = Depends(get_current_builder)):
    if db.scalar(select(Project).where(Project.slug == payload.slug)):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Slug '{payload.slug}' already exists")
    project = Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, db: Session = Depends(get_db)):
    return _get_project_or_404(db, project_id)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db), _builder: BuilderUser = Depends(get_current_builder)):
    project = _get_project_or_404(db, project_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db), _builder: BuilderUser = Depends(get_current_builder)):
    project = _get_project_or_404(db, project_id)
    db.delete(project)
    db.commit()


# --- Towers ---
@router.get("/{project_id}/towers", response_model=list[TowerRead])
def list_towers(project_id: int, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    return list(db.scalars(select(Tower).where(Tower.project_id == project_id).order_by(Tower.name)))


@router.post("/{project_id}/towers", response_model=TowerRead, status_code=status.HTTP_201_CREATED)
def create_tower(project_id: int, payload: TowerCreate, db: Session = Depends(get_db), _builder: BuilderUser = Depends(get_current_builder)):
    _get_project_or_404(db, project_id)
    tower = Tower(project_id=project_id, **payload.model_dump())
    db.add(tower)
    db.commit()
    db.refresh(tower)
    return tower


@router.get("/{project_id}/towers/{tower_id}/floors", response_model=list[FloorRead])
def list_floors(project_id: int, tower_id: int, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    tower = db.get(Tower, tower_id)
    if not tower or tower.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tower not found")
    return list(db.scalars(select(Floor).where(Floor.tower_id == tower_id).order_by(Floor.number)))


@router.post("/{project_id}/towers/{tower_id}/floors", response_model=FloorRead, status_code=status.HTTP_201_CREATED)
def create_floor(project_id: int, tower_id: int, payload: FloorCreate, db: Session = Depends(get_db), _builder: BuilderUser = Depends(get_current_builder)):
    _get_project_or_404(db, project_id)
    tower = db.get(Tower, tower_id)
    if not tower or tower.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tower not found")
    floor = Floor(tower_id=tower_id, **payload.model_dump())
    db.add(floor)
    db.commit()
    db.refresh(floor)
    return floor


# --- Units ---
@router.get("/{project_id}/units", response_model=list[UnitRead])
def list_units(
    project_id: int,
    status: str | None = Query(None),
    min_bhk: int | None = Query(None),
    max_price: float | None = Query(None),
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
    return list(db.scalars(stmt))


@router.get("/{project_id}/units/{unit_id}", response_model=UnitRead)
def get_unit(project_id: int, unit_id: int, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    unit = db.get(Unit, unit_id)
    if not unit or unit.floor.tower.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unit not found")
    return unit


@router.post("/{project_id}/towers/{tower_id}/floors/{floor_id}/units", response_model=UnitRead, status_code=status.HTTP_201_CREATED)
def create_unit(project_id: int, tower_id: int, floor_id: int, payload: UnitCreate, db: Session = Depends(get_db), _builder: BuilderUser = Depends(get_current_builder)):
    _get_project_or_404(db, project_id)
    floor = db.get(Floor, floor_id)
    if not floor or floor.tower_id != tower_id or floor.tower.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Floor not found under this tower/project")
    unit = Unit(floor_id=floor_id, **payload.model_dump())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.patch("/{project_id}/units/{unit_id}", response_model=UnitRead)
def update_unit(project_id: int, unit_id: int, payload: UnitUpdate, db: Session = Depends(get_db), _builder: BuilderUser = Depends(get_current_builder)):
    _get_project_or_404(db, project_id)
    unit = db.get(Unit, unit_id)
    if not unit or unit.floor.tower.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unit not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(unit, field, value)
    db.commit()
    db.refresh(unit)
    return unit


# --- Media assets ---
@router.get("/{project_id}/media", response_model=list[MediaAssetRead])
def list_media(project_id: int, media_type: str | None = Query(None), db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    stmt = select(MediaAsset).where(MediaAsset.project_id == project_id)
    if media_type:
        stmt = stmt.where(MediaAsset.media_type == media_type)
    return list(db.scalars(stmt))


@router.post("/{project_id}/media", response_model=MediaAssetRead, status_code=status.HTTP_201_CREATED)
def create_media(project_id: int, payload: MediaAssetCreate, db: Session = Depends(get_db), _builder: BuilderUser = Depends(get_current_builder)):
    _get_project_or_404(db, project_id)
    asset = MediaAsset(project_id=project_id, **payload.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset
