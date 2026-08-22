from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentBuilder
from app.core.database import get_db
from app.models import Enquiry, Floor, Project, SiteVisit, Tower, Unit

router = APIRouter(prefix="/builder", tags=["builder"])


@router.get("/projects")
def list_builder_projects(
    builder: CurrentBuilder,
    db: Session = Depends(get_db),
):
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    result = []
    for project in projects:
        units = (
            db.query(Unit)
            .join(Floor, Unit.floor_id == Floor.id)
            .join(Tower, Floor.tower_id == Tower.id)
            .filter(Tower.project_id == project.id)
            .all()
        )
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


@router.get("/projects/{project_id}/pipeline")
def builder_pipeline(
    project_id: int,
    builder: CurrentBuilder,
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)
    if not project:
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
                "name": v.name,
                "phone": v.phone,
                "scheduled_at": v.scheduled_at.isoformat(),
                "status": v.status.value if v.status else None,
            }
            for v in visits
        ],
    }
