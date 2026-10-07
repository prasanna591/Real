"""Data-layer helpers for the append-only engagement event log."""

from sqlalchemy.orm import Session

from app.models import AnalyticsEvent, EventType, Unit


def log_event(
    db: Session,
    event_type: EventType,
    project_id: int | None,
    unit_id: int | None = None,
    session_id: str = "",
    ref_user_id: int | None = None,
) -> None:
    """Record an analytics event, resolving the project from a unit when needed."""
    if project_id is None and unit_id is not None:
        unit = db.get(Unit, unit_id)
        if unit:
            project_id = unit.floor.tower.project_id
    if project_id is not None:
        db.add(
            AnalyticsEvent(
                event_type=event_type,
                project_id=project_id,
                unit_id=unit_id,
                session_id=session_id,
                ref_user_id=ref_user_id,
            )
        )