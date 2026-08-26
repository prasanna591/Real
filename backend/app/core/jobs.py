"""Background job definitions using ARQ.

Run with: arq app.core.jobs.WorkerSettings

Requires Redis: docker compose up -d redis
"""

import logging
from datetime import datetime

import structlog
from arq import cron
from arq.connections import RedisSettings
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal

logger = structlog.get_logger()
settings = get_settings()


async def send_enquiry_notification(ctx, enquiry_id: int) -> dict:
    """Send notification when a new enquiry is received.

    Placeholder for email/WhatsApp integration.
    """
    db: Session = SessionLocal()
    try:
        from app.models import Enquiry, Project

        enquiry = db.get(Enquiry, enquiry_id)
        if not enquiry:
            return {"status": "enquiry_not_found"}

        project = db.get(Project, enquiry.project_id)
        project_name = project.name if project else "Unknown"

        logger.info(
            "enquiry_notification",
            enquiry_id=enquiry_id,
            project=project_name,
            buyer=enquiry.name,
            phone=enquiry.phone,
        )

        # TODO: Integrate with email service (SendGrid/SES) or WhatsApp API
        # send_email(
        #     to=builder_email,
        #     subject=f"New enquiry for {project_name}",
        #     body=f"{enquiry.name} enquired about {project_name}..."
        # )

        return {"status": "sent", "enquiry_id": enquiry_id}
    finally:
        db.close()


async def send_visit_reminder(ctx, visit_id: int) -> dict:
    """Send reminder before a scheduled site visit."""
    db: Session = SessionLocal()
    try:
        from app.models import SiteVisit

        visit = db.get(SiteVisit, visit_id)
        if not visit:
            return {"status": "visit_not_found"}

        logger.info(
            "visit_reminder",
            visit_id=visit_id,
            visitor=visit.visitor_name,
            scheduled_at=visit.scheduled_at.isoformat(),
        )

        # TODO: Send SMS/WhatsApp reminder
        return {"status": "reminder_sent", "visit_id": visit_id}
    finally:
        db.close()


async def aggregate_analytics(ctx) -> dict:
    """Aggregate analytics data for faster dashboard queries.

    Runs daily via cron.
    """
    db: Session = SessionLocal()
    try:
        from app.models import AnalyticsEvent, EventType
        from sqlalchemy import func

        result = db.execute(
            select(
                AnalyticsEvent.project_id,
                AnalyticsEvent.event_type,
                func.count(),
            ).group_by(
                AnalyticsEvent.project_id,
                AnalyticsEvent.event_type,
            )
        ).all()

        logger.info("analytics_aggregated", rows=len(result))

        # TODO: Store in materialized view or summary table
        return {"status": "aggregated", "rows": len(result)}
    finally:
        db.close()


class WorkerSettings:
    """ARQ worker configuration.

    Run with: arq app.core.jobs.WorkerSettings
    """
    functions = [
        send_enquiry_notification,
        send_visit_reminder,
        aggregate_analytics,
    ]
    cron_jobs = [
        cron(aggregate_analytics, hour={3, 15}, minute={0}),  # Run at 3:00 and 15:00 UTC
    ]
    redis_settings = RedisSettings.from_dsn(
        settings.redis_url if hasattr(settings, "redis_url") else "redis://localhost:6379"
    )
    max_jobs = 10
    job_timeout = 30
    keep_result = 3600
