from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import CurrentBuilder
from app.core.database import get_db
from app.models import AnalyticsEvent, Enquiry, EventType, Floor, Project, SiteVisit, TourViewpoint, Tower, Unit
from app.schemas import AnalyticsSummary

router = APIRouter(prefix="/builder", tags=["builder"])


@router.get("/projects")
def list_builder_projects(
    builder: CurrentBuilder,
    db: Session = Depends(get_db),
):
    projects = db.scalars(
        select(Project)
        .where(Project.builder_id == builder.id)
        .options(joinedload(Project.towers).joinedload(Tower.floors).joinedload(Floor.units))
        .order_by(Project.created_at.desc())
    ).unique().all()

    result = []
    for project in projects:
        units = [u for tower in project.towers for floor in tower.floors for u in floor.units]
        result.append(
            {
                "id": project.id,
                "name": project.name,
                "slug": project.slug,
                "city": project.city,
                "property_type": project.property_type.value if project.property_type else None,
                "status": project.status.value if project.status else None,
                "starting_price": project.starting_price,
                "unit_count": len(units),
                "available_units": sum(1 for u in units if u.status.value == "available"),
            }
        )
    return result


@router.get("/analytics", response_model=AnalyticsSummary)
def builder_portfolio_analytics(builder: CurrentBuilder, db: Session = Depends(get_db)):
    """Lifetime engagement totals across the builder's projects."""
    builder_project_ids = db.scalars(
        select(Project.id).where(Project.builder_id == builder.id)
    ).all()

    event_counts = dict(
        db.execute(
            select(AnalyticsEvent.event_type, func.count())
            .where(AnalyticsEvent.project_id.in_(builder_project_ids))
            .group_by(AnalyticsEvent.event_type)
        ).all()
    )
    serious_explorers = (
        db.scalar(
            select(func.count(func.distinct(AnalyticsEvent.session_id))).where(
                AnalyticsEvent.event_type == EventType.WALKTHROUGH_COMPLETE,
                AnalyticsEvent.project_id.in_(builder_project_ids),
            )
        )
        or 0
    )

    def events(event_type: EventType) -> int:
        return event_counts.get(event_type, 0)

    return AnalyticsSummary(
        property_views=events(EventType.VIEW),
        serious_explorers=serious_explorers,
        saves=events(EventType.SAVE),
        enquiries=db.scalar(
            select(func.count()).select_from(Enquiry).where(Enquiry.project_id.in_(builder_project_ids))
        ) or 0,
        site_visits=db.scalar(
            select(func.count()).select_from(SiteVisit).where(SiteVisit.project_id.in_(builder_project_ids))
        ) or 0,
        assistant_messages=events(EventType.ASSISTANT_MESSAGE),
    )


@router.get("/projects/{project_id}/pipeline")
def builder_pipeline(
    project_id: int,
    builder: CurrentBuilder,
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)
    if not project or project.builder_id != builder.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    enquiries = (
        db.query(Enquiry)
        .filter(Enquiry.project_id == project_id)
        .order_by(Enquiry.created_at.desc())
        .all()
    )
    visits = (
        db.query(SiteVisit)
        .filter(SiteVisit.project_id == project_id)
        .order_by(SiteVisit.scheduled_at.desc())
        .all()
    )
    return {
        "enquiries": [
            {
                "id": e.id,
                "name": e.name,
                "phone": e.phone,
                "message": e.message,
                "status": e.status.value if e.status else None,
                "created_at": e.created_at.isoformat(),
            }
            for e in enquiries
        ],
        "site_visits": [
            {
                "id": v.id,
                "name": v.visitor_name,
                "phone": v.visitor_phone,
                "scheduled_at": v.scheduled_at.isoformat(),
                "status": v.status.value if v.status else None,
            }
            for v in visits
        ],
    }
