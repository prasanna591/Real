"""DB-grounded query layer shared by the LLM agent tools and the fallback engine."""

from datetime import date
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from app.models import Floor, Project, Tower, Unit

DEFAULT_INTEREST_RATE = 8.5
DEFAULT_TENURE_YEARS = 20


# --- Formatting helpers -------------------------------------------------------

def format_inr(amount: float | Decimal) -> str:
    value = float(amount)
    if value >= 1_00_00_000:
        crores = value / 1_00_00_000
        text = f"{crores:.2f}".rstrip("0").rstrip(".")
        return f"₹{text} Cr"
    if value >= 1_00_000:
        lakhs = value / 1_00_000
        text = f"{lakhs:.2f}".rstrip("0").rstrip(".")
        return f"₹{text} L"
    return f"₹{value:,.0f}"


# --- Grounded queries ---------------------------------------------------------

def calculate_emi(
    principal: float,
    annual_rate: float = DEFAULT_INTEREST_RATE,
    years: int = DEFAULT_TENURE_YEARS,
) -> dict[str, float | int]:
    """Reducing-balance EMI math."""
    if principal <= 0:
        raise ValueError("Principal must be positive")
    rate_monthly = annual_rate / 12 / 100
    months = years * 12
    factor = (1 + rate_monthly) ** months
    emi = principal * rate_monthly * factor / (factor - 1)
    total = emi * months
    return {
        "principal": round(principal, 2),
        "annual_rate_pct": annual_rate,
        "tenure_years": years,
        "monthly_emi": round(emi, 2),
        "total_interest": round(total - principal, 2),
        "total_payable": round(total, 2),
    }


def project_snapshot(db: Session, project_id: int) -> Optional[dict[str, Any]]:
    project = db.get(Project, project_id)
    if not project:
        return None
    units = list(
        db.scalars(
            select(Unit)
            .join(Floor, Unit.floor_id == Floor.id)
            .join(Tower, Floor.tower_id == Tower.id)
            .where(Tower.project_id == project.id)
        )
    )
    by_status: dict[str, int] = {}
    for unit in units:
        by_status[unit.status.value if hasattr(unit.status, "value") else str(unit.status)] = (
            by_status.get(unit.status.value if hasattr(unit.status, "value") else str(unit.status), 0) + 1
        )
    available = [u for u in units if str(u.status.value if hasattr(u.status, "value") else u.status) == "available"]

    bhk_mix: dict[int, dict[str, Any]] = {}
    for unit in available:
        entry = bhk_mix.setdefault(unit.bhk, {"count": 0, "min_price": unit.price, "max_area": unit.area_sqft})
        entry["count"] += 1
        entry["min_price"] = min(entry["min_price"], unit.price)
        entry["max_area"] = max(entry["max_area"], unit.area_sqft)

    return {
        "id": project.id,
        "name": project.name,
        "slug": project.slug,
        "property_type": str(project.property_type.value),
        "city": project.city,
        "locality": project.locality,
        "description": project.description,
        "starting_price": float(project.starting_price) if project.starting_price is not None else None,
        "possession_date": project.possession_date.isoformat() if project.possession_date else None,
        "amenities": list(project.amenities),
        "status": str(project.status.value),
        "unit_stats": {
            "total": len(units),
            **{f"{k}_units": v for k, v in sorted(by_status.items())},
        },
        "available_configurations": [
            {
                "bhk": bhk,
                "available_count": data["count"],
                "price_from": float(data["min_price"]),
                "largest_area_sqft": data["max_area"],
            }
            for bhk, data in sorted(bhk_mix.items())
        ],
    }


def search_projects(
    db: Session,
    city: str = "",
    property_type: str = "",
    max_budget: float = 0,
    min_bhk: int = 0,
    limit: int = 8,
) -> list[dict[str, Any]]:
    stmt = select(Project).where(Project.status == "active")
    if city:
        stmt = stmt.where(func.lower(Project.city).contains(city.lower()))
    if property_type:
        stmt = stmt.where(Project.property_type == property_type)

    if max_budget > 0:
        affordable = Project.starting_price.is_not(None) & (Project.starting_price <= max_budget)
        if min_bhk > 0:
            stmt = stmt.where(affordable | _matching_unit_exists(min_bhk=min_bhk, max_price=max_budget))
        else:
            stmt = stmt.where(affordable | _matching_unit_exists(max_price=max_budget))
    elif min_bhk > 0:
        stmt = stmt.where(_matching_unit_exists(min_bhk=min_bhk))

    projects = list(db.scalars(stmt.order_by(Project.starting_price.asc()).limit(limit)))
    results: list[dict[str, Any]] = []
    for project in projects:
        cheapest = (
            db.scalar(
                select(func.min(Unit.price))
                .join(Floor, Unit.floor_id == Floor.id)
                .join(Tower, Floor.tower_id == Tower.id)
                .where(Tower.project_id == project.id, Unit.status == "available")
            )
        )
        results.append(
            {
                "id": project.id,
                "name": project.name,
                "slug": project.slug,
                "property_type": str(project.property_type.value),
                "city": project.city,
                "locality": project.locality,
                "starting_price": float(project.starting_price) if project.starting_price is not None else None,
                "cheapest_available_unit_price": float(cheapest) if cheapest is not None else None,
                "amenities_count": len(project.amenities),
                "possession_date": project.possession_date.isoformat() if project.possession_date else None,
            }
        )
    return results


def find_units(
    db: Session,
    project_id: int,
    max_price: float = 0,
    min_bhk: int = 0,
    bhk: int = 0,
    facing: str = "",
    status: str = "available",
    limit: int = 10,
) -> list[dict[str, Any]]:
    stmt = (
        select(Unit, Floor.number.label("floor_number"), Tower.name.label("tower_name"))
        .join(Floor, Unit.floor_id == Floor.id)
        .join(Tower, Floor.tower_id == Tower.id)
        .where(Tower.project_id == project_id)
    )
    if status and status != "any":
        stmt = stmt.where(Unit.status == status)
    if max_price > 0:
        stmt = stmt.where(Unit.price <= max_price)
    effective_bhk = bhk or min_bhk
    if effective_bhk > 0:
        stmt = stmt.where(Unit.bhk == effective_bhk)
    if facing:
        stmt = stmt.where(func.lower(Unit.facing).contains(facing.lower()))
    stmt = stmt.order_by(Unit.price.asc()).limit(limit)
    rows = db.execute(stmt).all()
    return [
        {
            "id": unit.id,
            "unit_number": unit.unit_number,
            "tower": tower_name,
            "floor": floor_number,
            "bhk": unit.bhk,
            "area_sqft": unit.area_sqft,
            "facing": unit.facing,
            "price": float(unit.price),
            "status": str(unit.status.value),
        }
        for unit, floor_number, tower_name in rows
    ]


def best_view_unit(db: Session, project_id: int) -> Optional[dict[str, Any]]:
    """Highest-floor available unit — proxy for the best view."""
    row = db.execute(
        select(Unit, Floor.number.label("floor_number"), Tower.name.label("tower_name"))
        .join(Floor, Unit.floor_id == Floor.id)
        .join(Tower, Floor.tower_id == Tower.id)
        .where(Tower.project_id == project_id, Unit.status == "available")
        .order_by(Floor.number.desc(), Unit.area_sqft.desc())
        .limit(1)
    ).first()
    if not row:
        return None
    unit, floor_number, tower_name = row
    return {
        "id": unit.id,
        "unit_number": unit.unit_number,
        "tower": tower_name,
        "floor": floor_number,
        "bhk": unit.bhk,
        "area_sqft": unit.area_sqft,
        "facing": unit.facing,
        "price": float(unit.price),
    }


def family_suitability(db: Session, project_id: int) -> dict[str, Any]:
    snapshot = project_snapshot(db, project_id)
    if snapshot is None:
        return {}
    family_amenities = [
        a for a in snapshot["amenities"] if a in ("pool", "gym", "clubhouse", "park", "kids_play_area", "sports")
    ]
    three_bhk_plus = [c for c in snapshot["available_configurations"] if c["bhk"] >= 3]
    has_kids_area = "kids_play_area" in snapshot["amenities"]
    return {
        "project": snapshot["name"],
        "family_friendly_amenities": family_amenities,
        "has_kids_play_area": has_kids_area,
        "has_park": "park" in snapshot["amenities"],
        "three_bhk_plus_available": len(three_bhk_plus) > 0,
        "three_bhk_price_from": three_bhk_plus[0]["price_from"] if three_bhk_plus else None,
        "possession_date": snapshot["possession_date"],
        "verdict_score": int(bool(family_amenities)) + int(len(three_bhk_plus) > 0) + int(has_kids_area),
    }


def _matching_unit_exists(min_bhk: int = 0, max_price: float = 0):
    subq = (
        select(Unit.id)
        .join(Floor, Unit.floor_id == Floor.id)
        .join(Tower, Floor.tower_id == Tower.id)
        .where(Tower.project_id == Project.id, Unit.status == "available")
    )
    if min_bhk > 0:
        subq = subq.where(Unit.bhk >= min_bhk)
    if max_price > 0:
        subq = subq.where(Unit.price <= max_price)
    return exists(subq.scalar_subquery())


# --- Text rendering (used by the fallback engine) -----------------------------

def render_project_line(project: dict[str, Any]) -> str:
    price = format_inr(project["starting_price"]) if project.get("starting_price") else "price on request"
    location = ", ".join(filter(None, [project.get("locality"), project.get("city")]))
    return f"• {project['name']} ({project['property_type'].replace('_', ' ')}) — {location} · from {price}"


def render_unit_line(unit: dict[str, Any]) -> str:
    return (
        f"• {unit['unit_number']} · {unit['bhk']}BHK · {unit['area_sqft']:,.0f} sq.ft · "
        f"floor {unit['floor']} ({unit['tower']}) · {unit['facing'] or 'n/a'} facing · {format_inr(unit['price'])}"
    )


def render_emi(principal: float, rate: float = DEFAULT_INTEREST_RATE, years: int = DEFAULT_TENURE_YEARS) -> str:
    result = calculate_emi(principal, rate, years)
    return (
        f"For {format_inr(result['principal'])} at {rate:g}% for {years} years:\n"
        f"- Monthly EMI: ~{format_inr(result['monthly_emi'])}\n"
        f"- Total interest: {format_inr(result['total_interest'])}\n"
        f"- Total payable: {format_inr(result['total_payable'])}"
    )
