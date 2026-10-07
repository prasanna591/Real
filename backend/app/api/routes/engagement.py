import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_builder
from app.core.config import get_settings
from app.core.database import get_db
from app.core.events import log_event
from app.core.rate_limit import limiter
from app.core.uploads import IMAGE_CONTENT_TYPES, read_upload
from app.models import (
    AnalyticsEvent,
    BuilderRole,
    BuilderUser,
    CustomerUser,
    Enquiry,
    EnquiryNote,
    EnquiryStatus,
    EventType,
    ListingRequest,
    Project,
    SavedItem,
    SiteVisit,
    Unit,
)
from app.schemas import (
    AnalyticsEventCreate,
    AnalyticsSummary,
    CustomerUserCreate,
    CustomerUserRead,
    EnquiryCreate,
    EnquiryNoteCreate,
    EnquiryNoteRead,
    EnquiryRead,
    EnquiryStatusUpdate,
    ListingRequestCreate,
    ListingRequestRead,
    MyEnquiryRead,
    SavedItemCreate,
    SavedItemRead,
    SiteVisitCreate,
    SiteVisitRead,
    SiteVisitUpdate,
)

router = APIRouter(tags=["engagement"])


# --- Users ---
@router.post("/users", response_model=CustomerUserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("120/hour")
def create_user(request: Request, payload: CustomerUserCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(CustomerUser).where(CustomerUser.phone == payload.phone))
    if existing:
        return existing  # idempotent sign-in by phone
    user = CustomerUser(**payload.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# --- Listing requests (customers posting their property) ---
@router.post(
    "/listing-requests",
    response_model=ListingRequestRead,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("20/hour")
def create_listing_request(request: Request, payload: ListingRequestCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(CustomerUser).where(CustomerUser.phone == payload.phone))
    listing = ListingRequest(
        **payload.model_dump(),
        user_id=existing.id if existing else None,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


@router.post(
    "/listing-requests/{listing_request_id}/images",
    response_model=ListingRequestRead,
    status_code=status.HTTP_200_OK,
)
@limiter.limit("60/hour")
def upload_listing_request_images(
    listing_request_id: int,
    request: Request,
    images: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """Attach one or more photos to a customer listing request.

    Files are stored under the configured media dir (served at /media) and their
    public URLs are appended to the request's `images` list.
    """
    listing = db.get(ListingRequest, listing_request_id)
    if listing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing request not found")

    settings = get_settings()
    uploads_dir = settings.media_dir / "listing-photos"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    ext_by_type = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

    urls: list[str] = []
    for image in images:
        if image.content_type not in IMAGE_CONTENT_TYPES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unsupported image type: {image.content_type}")
        content = read_upload(image, max_size_mb=10)
        ext = Path(image.filename or "").suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            ext = ext_by_type[image.content_type]
        filename = f"lr{listing_request_id}-{uuid.uuid4().hex}{ext}"
        (uploads_dir / filename).write_bytes(content)
        relative = f"listing-photos/{filename}"
        if settings.public_base_url:
            urls.append(f"{settings.public_base_url}/media/{relative}")
        else:
            urls.append(f"/media/{relative}")

    listing.images = [*(listing.images or []), *urls]
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


# --- Saved / shortlist ---
@router.post("/saved", response_model=SavedItemRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def save_item(request: Request, payload: SavedItemCreate, db: Session = Depends(get_db)):
    try:
        payload.validated()
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    if not db.get(CustomerUser, payload.user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    stmt = select(SavedItem).where(SavedItem.user_id == payload.user_id)
    if payload.unit_id is not None:
        stmt = stmt.where(SavedItem.unit_id == payload.unit_id)
    else:
        stmt = stmt.where(SavedItem.project_id == payload.project_id)
    existing = db.scalar(stmt)
    if existing:
        return existing
    # Exactly one target per row (see ck_saved_item_single_target): ignore the
    # redundant project_id when a unit is being saved and fill unit_id otherwise.
    project_id = payload.project_id
    if payload.unit_id is not None:
        unit = db.get(Unit, payload.unit_id)
        if not unit:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Unit not found")
        project_id = unit.floor.tower.project_id
        item = SavedItem(user_id=payload.user_id, unit_id=payload.unit_id)
    else:
        if not db.get(Project, payload.project_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
        item = SavedItem(user_id=payload.user_id, project_id=payload.project_id)
    # Atomic increment — a concurrent duplicate insert triggers IntegrityError,
    # and db.rollback() reverts the increment cleanly.
    db.execute(
        update(Project)
        .where(Project.id == project_id)
        .values(save_count=Project.save_count + 1)
    )
    db.add(item)
    log_event(db, EventType.SAVE, project_id, payload.unit_id)
    try:
        db.commit()
    except IntegrityError:
        # Concurrent duplicate save — the DB unique index rejected one of them.
        db.rollback()
        existing = db.scalar(stmt)
        if not existing:
            raise HTTPException(status.HTTP_409_CONFLICT, "Could not save item")
        return existing
    db.refresh(item)
    return item


@router.get("/users/{user_id}/saved", response_model=list[SavedItemRead])
def list_saved(user_id: int, db: Session = Depends(get_db)):
    return list(db.scalars(select(SavedItem).where(SavedItem.user_id == user_id)))


@router.delete("/saved/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
def unsave_item(request: Request, item_id: int, session_id: str = "", db: Session = Depends(get_db)):
    item = db.get(SavedItem, item_id)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Saved item not found")
    log_event(db, EventType.UNSAVE, item.project_id, item.unit_id, session_id)
    project_id = item.project_id
    if project_id is None and item.unit_id is not None:
        unit = db.get(Unit, item.unit_id)
        project_id = unit.floor.tower.project_id if unit else None
    # Atomic guarded decrement
    if project_id is not None:
        db.execute(
            update(Project)
            .where(Project.id == project_id, Project.save_count > 0)
            .values(save_count=Project.save_count - 1)
        )
    db.delete(item)
    db.commit()


# --- Enquiries ---
@router.post("/enquiries", response_model=EnquiryRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/hour")
def create_enquiry(request: Request, payload: EnquiryCreate, db: Session = Depends(get_db)):
    if not db.get(Project, payload.project_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    enquiry = Enquiry(**payload.model_dump())
    db.add(enquiry)
    log_event(db, EventType.ENQUIRY, payload.project_id, payload.unit_id)
    db.commit()
    db.refresh(enquiry)

    # Log notification intent (actual sending handled by ARQ worker)
    import structlog
    structlog.get_logger("engagement").info(
        "enquiry_created",
        enquiry_id=enquiry.id,
        project_id=enquiry.project_id,
        buyer=enquiry.name,
    )

    return enquiry


def _builder_owns_project(db: Session, project_id: int, builder: BuilderUser) -> bool:
    """True if the builder manages the project (or is an admin)."""
    project = db.get(Project, project_id)
    return project is not None and (builder.role == BuilderRole.ADMIN or project.builder_id == builder.id)


def _get_owned_enquiry_or_404(db: Session, enquiry_id: int, builder: BuilderUser) -> Enquiry:
    enquiry = db.get(Enquiry, enquiry_id)
    if not enquiry or not _builder_owns_project(db, enquiry.project_id, builder):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enquiry not found")
    return enquiry


def _get_owned_visit_or_404(db: Session, visit_id: int, builder: BuilderUser) -> SiteVisit:
    visit = db.get(SiteVisit, visit_id)
    if not visit or not _builder_owns_project(db, visit.project_id, builder):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Site visit not found")
    return visit


@router.get("/enquiries", response_model=list[EnquiryRead])
def list_enquiries(project_id: int | None = Query(None), db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    stmt = select(Enquiry).order_by(Enquiry.created_at.desc())
    if project_id is not None:
        if not _builder_owns_project(db, project_id, builder):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
        stmt = stmt.where(Enquiry.project_id == project_id)
    elif builder.role != BuilderRole.ADMIN:
        owned = select(Project.id).where(Project.builder_id == builder.id)
        stmt = stmt.where(Enquiry.project_id.in_(owned))
    return list(db.scalars(stmt))


@router.get("/enquiries/me", response_model=list[MyEnquiryRead])
@limiter.limit("120/hour")
def my_enquiries(request: Request, phone: str = Query(...), db: Session = Depends(get_db)):
    """Customer-facing enquiry status lookup — matches by the phone used at sign-in."""
    rows = (
        db.execute(
            select(
                Enquiry.id,
                Enquiry.project_id,
                Project.name.label("project_name"),
                Enquiry.unit_id,
                Enquiry.status,
                Enquiry.created_at,
            )
            .join(Project, Project.id == Enquiry.project_id)
            .where(Enquiry.phone == phone.strip())
            .order_by(Enquiry.created_at.desc())
        )
        .mappings()
        .all()
    )
    return [MyEnquiryRead.model_validate(row) for row in rows]


@router.patch("/enquiries/{enquiry_id}", response_model=EnquiryRead)
def update_enquiry_status(enquiry_id: int, payload: EnquiryStatusUpdate, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    enquiry = _get_owned_enquiry_or_404(db, enquiry_id, builder)
    enquiry.status = payload.status
    if payload.status == EnquiryStatus.BOOKED:
        log_event(db, EventType.BOOKING, enquiry.project_id, enquiry.unit_id)
    db.commit()
    db.refresh(enquiry)
    return enquiry


# --- Site visits ---
@router.post("/site-visits", response_model=SiteVisitRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/hour")
def create_site_visit(request: Request, payload: SiteVisitCreate, db: Session = Depends(get_db)):
    if not db.get(Project, payload.project_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    visit = SiteVisit(**payload.model_dump())
    db.add(visit)
    log_event(db, EventType.SITE_VISIT_BOOKED, payload.project_id, payload.unit_id)
    db.commit()
    db.refresh(visit)
    return visit


@router.get("/site-visits", response_model=list[SiteVisitRead])
def list_site_visits(project_id: int | None = Query(None), db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    stmt = select(SiteVisit).order_by(SiteVisit.scheduled_at)
    if project_id is not None:
        if not _builder_owns_project(db, project_id, builder):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
        stmt = stmt.where(SiteVisit.project_id == project_id)
    elif builder.role != BuilderRole.ADMIN:
        owned = select(Project.id).where(Project.builder_id == builder.id)
        stmt = stmt.where(SiteVisit.project_id.in_(owned))
    return list(db.scalars(stmt))


@router.patch("/site-visits/{visit_id}", response_model=SiteVisitRead)
def update_site_visit(visit_id: int, payload: SiteVisitUpdate, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    visit = _get_owned_visit_or_404(db, visit_id, builder)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(visit, field, value)
    db.commit()
    db.refresh(visit)
    return visit


# --- Analytics ---
@router.post("/analytics/events", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("600/minute")
def track_event(request: Request, payload: AnalyticsEventCreate, db: Session = Depends(get_db)):
    if not db.get(Project, payload.project_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    log_event(
        db,
        EventType(payload.event_type),
        payload.project_id,
        payload.unit_id,
        payload.session_id,
        payload.ref_user_id,
    )
    db.commit()
    return {"tracked": True}


@router.get("/projects/{project_id}/analytics/summary", response_model=AnalyticsSummary)
def analytics_summary(project_id: int, db: Session = Depends(get_db), builder: BuilderUser = Depends(get_current_builder)):
    if not _builder_owns_project(db, project_id, builder):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    def event_count(event_type: EventType) -> int:
        return (
            db.scalar(
                select(func.count())
                .select_from(AnalyticsEvent)
                .where(AnalyticsEvent.project_id == project_id)
                .where(AnalyticsEvent.event_type == event_type)
            )
            or 0
        )

    serious_explorers = (
        db.scalar(
            select(func.count(func.distinct(AnalyticsEvent.session_id)))
            .select_from(AnalyticsEvent)
            .where(AnalyticsEvent.project_id == project_id)
            .where(AnalyticsEvent.event_type == EventType.WALKTHROUGH_COMPLETE)
        )
        or 0
    )
    enquiries = (
        db.scalar(
            select(func.count())
            .select_from(Enquiry)
            .where(Enquiry.project_id == project_id)
        )
        or 0
    )
    visits = (
        db.scalar(
            select(func.count())
            .select_from(SiteVisit)
            .where(SiteVisit.project_id == project_id)
        )
        or 0
    )

    return AnalyticsSummary(
        property_views=event_count(EventType.VIEW),
        serious_explorers=serious_explorers,
        saves=event_count(EventType.SAVE),
        enquiries=enquiries,
        site_visits=visits,
        assistant_messages=event_count(EventType.ASSISTANT_MESSAGE),
        shares=event_count(EventType.SHARE),
    )


# --- Enquiry Notes ---
@router.post("/enquiries/{enquiry_id}/notes", response_model=EnquiryNoteRead, status_code=status.HTTP_201_CREATED)
def add_enquiry_note(
    enquiry_id: int,
    payload: EnquiryNoteCreate,
    db: Session = Depends(get_db),
    builder: BuilderUser = Depends(get_current_builder),
):
    enquiry = _get_owned_enquiry_or_404(db, enquiry_id, builder)
    note = EnquiryNote(
        enquiry_id=enquiry_id,
        builder_id=builder.id,
        content=payload.content,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/enquiries/{enquiry_id}/notes", response_model=list[EnquiryNoteRead])
def list_enquiry_notes(
    enquiry_id: int,
    db: Session = Depends(get_db),
    builder: BuilderUser = Depends(get_current_builder),
):
    enquiry = _get_owned_enquiry_or_404(db, enquiry_id, builder)
    return list(
        db.scalars(
            select(EnquiryNote)
            .where(EnquiryNote.enquiry_id == enquiry_id)
            .order_by(EnquiryNote.created_at.desc())
        )
    )
