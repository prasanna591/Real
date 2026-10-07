from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models import (
    BuilderUser,
    CustomerBuilderFollow,
    CustomerUser,
    Floor,
    Project,
    Tower,
    Unit,
)
from app.schemas import (
    BuilderCard,
    FeedItem,
    FeedResponse,
    FollowRead,
    ProjectRead,
)
from app.schemas.social import FollowCreate

router = APIRouter(prefix="/social", tags=["social"])


# --- Builder suggestions (people to follow) ---
@router.get("/builders", response_model=list[BuilderCard])
def list_builder_suggestions(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    followers = (
        select(
            CustomerBuilderFollow.builder_id,
            func.count().label("follower_count"),
        )
        .group_by(CustomerBuilderFollow.builder_id)
        .subquery()
    )
    projects = (
        select(Project.builder_id, func.count().label("project_count"))
        .where(Project.status != "draft")
        .group_by(Project.builder_id)
        .subquery()
    )
    rows = db.execute(
        select(
            BuilderUser,
            func.coalesce(followers.c.follower_count, 0).label("follower_count"),
            func.coalesce(projects.c.project_count, 0).label("project_count"),
        )
        .outerjoin(followers, followers.c.builder_id == BuilderUser.id)
        .outerjoin(projects, projects.c.builder_id == BuilderUser.id)
        .order_by(func.coalesce(followers.c.follower_count, 0).desc(), BuilderUser.name)
        .limit(limit)
    ).all()
    return [
        BuilderCard(
            id=builder.id,
            name=builder.name,
            project_count=project_count,
            follower_count=follower_count,
        )
        for builder, follower_count, project_count in rows
    ]


# --- Follow / unfollow ---
@router.post("/follows", response_model=FollowRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def follow_builder(request: Request, payload: FollowCreate, db: Session = Depends(get_db)):
    if not db.get(CustomerUser, payload.user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if not db.get(BuilderUser, payload.builder_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Builder not found")
    existing = db.scalar(
        select(CustomerBuilderFollow).where(
            CustomerBuilderFollow.user_id == payload.user_id,
            CustomerBuilderFollow.builder_id == payload.builder_id,
        )
    )
    if existing:
        return existing
    follow = CustomerBuilderFollow(user_id=payload.user_id, builder_id=payload.builder_id)
    db.add(follow)
    try:
        db.commit()
    except IntegrityError:
        # Concurrent duplicate follow — the unique constraint won one race.
        db.rollback()
        existing = db.scalar(
            select(CustomerBuilderFollow).where(
                CustomerBuilderFollow.user_id == payload.user_id,
                CustomerBuilderFollow.builder_id == payload.builder_id,
            )
        )
        if not existing:
            raise HTTPException(status.HTTP_409_CONFLICT, "Could not follow builder")
        return existing
    db.refresh(follow)
    return follow


@router.delete("/follows", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
def unfollow_builder(
    request: Request,
    user_id: int = Query(...),
    builder_id: int = Query(...),
    db: Session = Depends(get_db),
):
    follow = db.scalar(
        select(CustomerBuilderFollow).where(
            CustomerBuilderFollow.user_id == user_id,
            CustomerBuilderFollow.builder_id == builder_id,
        )
    )
    if not follow:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not following this builder")
    db.delete(follow)
    db.commit()


@router.get("/users/{user_id}/following", response_model=list[BuilderCard])
def list_following(user_id: int, db: Session = Depends(get_db)):
    if not db.get(CustomerUser, user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    followers = (
        select(CustomerBuilderFollow.builder_id, func.count().label("follower_count"))
        .group_by(CustomerBuilderFollow.builder_id)
        .subquery()
    )
    projects = (
        select(Project.builder_id, func.count().label("project_count"))
        .where(Project.status != "draft")
        .group_by(Project.builder_id)
        .subquery()
    )
    rows = db.execute(
        select(
            BuilderUser,
            func.coalesce(followers.c.follower_count, 0).label("follower_count"),
            func.coalesce(projects.c.project_count, 0).label("project_count"),
        )
        .join(CustomerBuilderFollow, CustomerBuilderFollow.builder_id == BuilderUser.id)
        .outerjoin(followers, followers.c.builder_id == BuilderUser.id)
        .outerjoin(projects, projects.c.builder_id == BuilderUser.id)
        .where(CustomerBuilderFollow.user_id == user_id)
        .order_by(CustomerBuilderFollow.created_at.desc())
    ).all()
    return [
        BuilderCard(
            id=builder.id,
            name=builder.name,
            project_count=project_count,
            follower_count=follower_count,
        )
        for builder, follower_count, project_count in rows
    ]


# --- Social feed ---
def _feed_item(
    project: Project,
    now: datetime,
    unit_recent_count: int,
    recent_unit_ts: datetime | None,
) -> FeedItem:
    """Shape one project into a feed entry with a socially-flavoured headline."""
    created = project.created_at
    entry_ts = recent_unit_ts or created

    if unit_recent_count > 0:
        kind = "units"
        headline = f"{unit_recent_count} new {_noun(unit_recent_count)} just listed"
        sub = f"by {project.builder_name or 'builder'} · {project.city}"
    elif created >= now - timedelta(days=30):
        kind = "launch"
        headline = "Just launched"
        sub = f"by {project.builder_name or 'builder'} · {project.locality or project.city}"
    elif project.save_count >= 3:
        kind = "popular"
        headline = f"{project.save_count} people shortlisted this"
        sub = f"{project.locality or project.city} · {project.city}"
    else:
        kind = "featured"
        headline = "Trending in your city"
        sub = f"{project.locality or project.city} · {project.city}"

    return FeedItem(
        id=f"{project.id}:{kind}",
        kind=kind,
        builder_id=project.builder_id or 0,
        builder_name=project.builder_name or "",
        headline=headline,
        sub=sub,
        created_at=entry_ts,
        project=ProjectRead.model_validate(project),
    )


def _noun(count: int) -> str:
    return "unit" if count == 1 else "units"


@router.get("/feed", response_model=FeedResponse)
@limiter.limit("120/minute")
def social_feed(
    request: Request,
    user_id: int | None = Query(None),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Personalised feed.

    With `user_id`: entries from followed builders (recency-ranked by the most
    recent signal: unit additions or project launch). Without follows (or
    anonymous), falls back to a "discover" feed of the latest active projects.
    """
    # SQLite stores naive timestamps, so compare with naive UTC for parity.
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    since_7d = now - timedelta(days=7)

    followed_ids: list[int] = []
    if user_id:
        followed_ids = list(
            db.scalars(
                select(CustomerBuilderFollow.builder_id).where(
                    CustomerBuilderFollow.user_id == user_id
                )
            )
        )

    if followed_ids:
        stmt = (
            select(Project)
            .join(BuilderUser, BuilderUser.id == Project.builder_id)
            .where(
                Project.builder_id.in_(followed_ids),
                Project.status != "draft",
            )
            .options(joinedload(Project.builder))
            .order_by(Project.created_at.desc())
        )
        mode = "following"
    else:
        stmt = (
            select(Project)
            .join(BuilderUser, BuilderUser.id == Project.builder_id)
            .where(Project.status != "draft")
            .options(joinedload(Project.builder))
            .order_by(Project.created_at.desc())
        )
        mode = "discover"

    projects = list(db.scalars(stmt.limit(min(limit * 2, 100))))

    if not projects:
        return FeedResponse(mode=mode, items=[])

    # Recent unit additions per project (last 7 days) — drives headline + ranking.
    unit_stats = db.execute(
        select(
            Tower.project_id,
            func.count(Unit.id).filter(Unit.created_at >= since_7d),
            func.max(Unit.created_at).filter(Unit.created_at >= since_7d),
        )
        .select_from(Unit)
        .join(Floor, Floor.id == Unit.floor_id)
        .join(Tower, Tower.id == Floor.tower_id)
        .where(Unit.status == "available")
        .group_by(Tower.project_id)
    ).all()

    counts: dict[int, int] = {row[0]: row[1] for row in unit_stats}
    latest_ts: dict[int, datetime] = {
        row[0]: row[2] for row in unit_stats if row[2] is not None
    }

    items = [
        _feed_item(
            project,
            now,
            counts.get(project.id, 0),
            latest_ts.get(project.id),
        )
        for project in projects
    ]
    # Recency-ranked by the driving signal (unit additions trump project age).
    items.sort(key=lambda item: item.created_at, reverse=True)
    return FeedResponse(mode=mode, items=items[:limit])