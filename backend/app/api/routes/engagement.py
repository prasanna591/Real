from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_builder
from app.core.database import get_db
from app.models import (
    AnalyticsEvent,
    BuilderUser,
    CustomerUser,
    Enquiry,
    EnquiryNote,
    EnquiryStatus,
    EventType,
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
    SavedItemCreate,
    SavedItemRead,
    SiteVisitCreate,
    SiteVisitRead,
    SiteVisitUpdate,
)

router = APIRouter(tags=["engagement"])


# --- Users ---
@router.post("/users", response_model=CustomerUserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: CustomerUserCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(CustomerUser).where(CustomerUser.phone == payload.phone))
    if existing:
        return existing  # idempotent sign-in by phone
    user = CustomerUser(**payload.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# --- Saved / shortlist ---
def _log(db: Session, event_type: EventType, project_id: int | None, unit_id: int | None, session_id: str = ""):
    if project_id is None and unit_id is not None:
        unit = db.get(Unit, unit_id)
        if unit:
            project_id = unit.floor.tower.project_id
    if project_id is not None:
        db.add(
            AnalyticsEvent(
                event_type=event_type, project_id=project_id, unit_id=unit_id, session_id=session_id
            )
        )


@router.post("/saved", response_model=SavedItemRead, status_code=status.HTTP_201_CREATED)
def save_item(payload: SavedItemCreate, db: Session = Depends(get_db)):
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
    item = SavedItem(**payload.model_dump())
    db.add(item)
    _log(db, EventType.SAVE, payload.project_id, payload.unit_id)
    db.commit()
    db.refresh(item)
    return item


@router.get("/users/{user_id}/saved", response_model=list[SavedItemRead])
def list_saved(user_id: int, db: Session = Depends(get_db)):
    return list(db.scalars(select(SavedItem).where(SavedItem.user_id == user_id)))


@router.delete("/saved/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsave_item(item_id: int, session_id: str = "", db: Session = Depends(get_db)):
    item = db.get(SavedItem, item_id)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Saved item not found")
    _log(db, EventType.UNSAVE, item.project_id, item.unit_id, session_id)
    db.delete(item)
    db.commit()


# --- Enquiries ---
@router.post("/enquiries", response_model=EnquiryRead, status_code=status.HTTP_201_CREATED)
def create_enquiry(payload: EnquiryCreate, db: Session = Depends(get_db)):
    if not db.get(Project, payload.project_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    enquiry = Enquiry(**payload.model_dump())
    db.add(enquiry)
    _log(db, EventType.ENQUIRY, payload.project_id, payload.unit_id)
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


@router.get("/enquiries", response_model=list[EnquiryRead])
def list_enquiries(project_id: int | None = Query(None), db: Session = Depends(get_db), _builder: BuilderUser = Depends(get_current_builder)):
    stmt = select(Enquiry).order_by(Enquiry.created_at.desc())
    if project_id is not None:
        stmt = stmt.where(Enquiry.project_id == project_id)
    return list(db.scalars(stmt))


@router.patch("/enquiries/{enquiry_id}", response_model=EnquiryRead)
def update_enquiry_status(enquiry_id: int, payload: EnquiryStatusUpdate, db: Session = Depends(get_db), _builder: BuilderUser = Depends(get_current_builder)):
    enquiry = db.get(Enquiry, enquiry_id)
    if not enquiry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enquiry not found")
    enquiry.status = payload.status
    if payload.status == EnquiryStatus.BOOKED:
        _log(db, EventType.BOOKING, enquiry.project_id, enquiry.unit_id)
    db.commit()
    db.refresh(enquiry)
    return enquiry


# --- Site visits ---
@router.post("/site-visits", response_model=SiteVisitRead, status_code=status.HTTP_201_CREATED)
def create_site_visit(payload: SiteVisitCreate, db: Session = Depends(get_db)):
    if not db.get(Project, payload.project_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    visit = SiteVisit(**payload.model_dump())
    db.add(visit)
    _log(db, EventType.SITE_VISIT_BOOKED, payload.project_id, payload.unit_id)
    db.commit()
    db.refresh(visit)
    return visit


@router.get("/site-visits", response_model=list[SiteVisitRead])
def list_site_visits(project_id: int | None = Query(None), db: Session = Depends(get_db), _builder: BuilderUser = Depends(get_current_builder)):
    stmt = select(SiteVisit).order_by(SiteVisit.scheduled_at)
    if project_id is not None:
        stmt = stmt.where(SiteVisit.project_id == project_id)
    return list(db.scalars(stmt))


@router.patch("/site-visits/{visit_id}", response_model=SiteVisitRead)
def update_site_visit(visit_id: int, payload: SiteVisitUpdate, db: Session = Depends(get_db), _builder: BuilderUser = Depends(get_current_builder)):
    visit = db.get(SiteVisit, visit_id)
    if not visit:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Site visit not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(visit, field, value)
    db.commit()
    db.refresh(visit)
    return visit


# --- Analytics ---
@router.post("/analytics/events", status_code=status.HTTP_202_ACCEPTED)
def track_event(payload: AnalyticsEventCreate, db: Session = Depends(get_db)):
    if not db.get(Project, payload.project_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    _log(
        db,
        EventType(payload.event_type),
        payload.project_id,
        payload.unit_id,
        payload.session_id,
    )
    db.commit()
    return {"tracked": True}


@router.get("/projects/{project_id}/analytics/summary", response_model=AnalyticsSummary)
def analytics_summary(project_id: int, db: Session = Depends(get_db), _builder: BuilderUser = Depends(get_current_builder)):
    if not db.get(Project, project_id):
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
    )


# --- Enquiry Notes ---
@router.post("/enquiries/{enquiry_id}/notes", response_model=EnquiryNoteRead, status_code=status.HTTP_201_CREATED)
def add_enquiry_note(
    enquiry_id: int,
    payload: EnquiryNoteCreate,
    db: Session = Depends(get_db),
    builder: BuilderUser = Depends(get_current_builder),
):
    enquiry = db.get(Enquiry, enquiry_id)
    if not enquiry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enquiry not found")
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
    _builder: BuilderUser = Depends(get_current_builder),
):
    enquiry = db.get(Enquiry, enquiry_id)
    if not enquiry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enquiry not found")
    return list(
        db.scalars(
            select(EnquiryNote)
            .where(EnquiryNote.enquiry_id == enquiry_id)
            .order_by(EnquiryNote.created_at.desc())
        )
    )
