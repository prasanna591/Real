"""Deterministic, DB-grounded answer engine.

Used when no LLM key is configured (or when the LLM call fails), so the
assistant always answers from real listing data. Covers the core intents
from the product vision §2.9: budget search, EMI, family suitability,
unit availability, best view, possession/amenities/location.
"""

import re
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.ai import grounding

_BUDGET_RE = re.compile(
    r"(?:under|below|less than|max|maximum|upto|up to|within|budget of|budget)\s*"
    r"[₹rs.]*\s*(\d+(?:\.\d+)?)\s*(cr|crore|lakhs?|l)\b",
    re.IGNORECASE,
)
_PLAIN_BUDGET_RE = re.compile(r"(\d{6,9})\b")
_EMI_RE = re.compile(r"\bemi\b|\bloan\b|monthly payment|installment", re.IGNORECASE)
_FAMILY_RE = re.compile(r"family|kids?\b|child|children|school", re.IGNORECASE)
_VIEW_RE = re.compile(r"balcony|view|best unit|top floor|highest floor|penthouse", re.IGNORECASE)
_UNITS_RE = re.compile(r"available|availability|units|flats|inventory|left|\d\s*bhk", re.IGNORECASE)
_AMENITIES_RE = re.compile(r"amenit|pool|gym|clubhouse|park(?!ing)|sports|play", re.IGNORECASE)
_POSSESSION_RE = re.compile(r"possession|handover|ready|complet", re.IGNORECASE)
_LOCATION_RE = re.compile(r"where|location|address|metro|airport|reach|area", re.IGNORECASE)
_GREETING_RE = re.compile(r"^\s*(hi|hii+|hello|hey|help|menu|start|what can you do)[!.? ]*\s*$", re.IGNORECASE)
_BHK_RE = re.compile(r"(\d)\s*bhk", re.IGNORECASE)


def answer(db: Session, message: str, project_id: Optional[int] = None) -> str:
    """Route the user message to a grounded handler."""
    text = message.strip()

    if _GREETING_RE.match(text):
        return _capabilities_reply(project_id)

    emi_amount = _extract_amount(text) if _EMI_RE.search(text) else None
    if _EMI_RE.search(text):
        return _emi_reply(db, text, project_id, emi_amount)

    budget = _extract_budget(text)
    if budget is not None:
        return _budget_reply(db, budget, _extract_bhk(text))

    if _FAMILY_RE.search(text):
        return _family_reply(db, project_id)

    if _VIEW_RE.search(text):
        return _view_reply(db, project_id)

    if _UNITS_RE.search(text) or _extract_bhk(text):
        return _units_reply(db, project_id, _extract_bhk(text), _extract_plain_amount(text))

    if _AMENITIES_RE.search(text):
        return _amenities_reply(db, project_id)

    if _POSSESSION_RE.search(text):
        return _possession_reply(db, project_id)

    if _LOCATION_RE.search(text):
        return _location_reply(db, project_id)

    if project_id:
        return _snapshot_summary(db, project_id)
    return _catalog_overview(db)


# --- Handlers -----------------------------------------------------------------

def _capabilities_reply(project_id: Optional[int]) -> str:
    scope = "this project" if project_id else "our projects"
    return (
        "I'm your property assistant 🏠 I can answer questions about "
        f"{scope} using live listing data:\n"
        "• “Show 2BHK units under ₹1.5 Cr”\n"
        "• “What's the EMI for ₹1.25 crore?”\n"
        "• “Is this good for a family with two children?”\n"
        "• “Which unit has the best balcony view?”\n"
        "• Amenities, possession date and location details"
    )


def _emi_reply(db: Session, text: str, project_id: Optional[int], amount: Optional[float]) -> str:
    principal = amount
    if principal is None and project_id is not None:
        units = grounding.find_units(db, project_id)
        cheapest = min((u["price"] for u in units), default=None)
        snapshot = grounding.project_snapshot(db, project_id)
        starting = snapshot.get("starting_price") if snapshot else None
        candidates = [p for p in (cheapest, starting) if p]
        principal = min(candidates) if candidates else None
    if principal is None:
        projects = grounding.search_projects(db)
        prices = [p["starting_price"] for p in projects if p.get("starting_price")]
        if not prices:
            return "Tell me the loan amount and I'll compute the EMI — e.g. “EMI for ₹1.25 crore”."
        principal = min(prices)
    tenure = 20
    years_match = re.search(r"(\d+)\s*year", text, re.IGNORECASE)
    if years_match:
        tenure = max(1, min(40, int(years_match.group(1))))
    rate = 8.5
    pct_match = re.search(r"(\d(?:\.\d+)?)\s*%", text)
    if pct_match:
        rate = float(pct_match.group(1))
    return (
        f"{grounding.render_emi(principal, rate, tenure)}\n\n"
        "_Indicative only — final rates depend on your bank._"
    )


def _budget_reply(db: Session, budget: float, bhk: int) -> str:
    bhk_part = f" {bhk}BHK" if bhk else ""
    projects = grounding.search_projects(db, max_budget=budget, min_bhk=bhk)
    if not projects:
        pretty = grounding.format_inr(budget)
        return (
            f"I couldn't find any active project{bhk_part} under {pretty} right now. "
            "Try a slightly higher budget, or ask me what's available overall."
        )
    lines = [f"Projects with {bhk_part.strip() or 'homes'} under {grounding.format_inr(budget)}:".strip()]
    lines += [grounding.render_project_line(p) for p in projects]
    scoped = next((p for p in projects), None)
    extra = ""
    if scoped:
        units = grounding.find_units(db, scoped["id"], max_price=budget, bhk=bhk or 0)
        if units:
            extra = (
                f"\n\nIn {scoped['name']} specifically:\n"
                + "\n".join(grounding.render_unit_line(u) for u in units[:4])
                + "\n\nOpen the project → Unit availability to book one."
            )
    return "\n".join(lines) + extra


def _family_reply(db: Session, project_id: Optional[int]) -> str:
    if project_id is None:
        projects = grounding.search_projects(db)
        if not projects:
            return "No active projects yet — check back soon."
        names = ", ".join(p["name"] for p in projects[:3])
        return (
            "Open a specific project and ask me again — I'll evaluate its parks, play areas, "
            f"clubhouse and 3BHK+ availability. Currently showcasing: {names}."
        )
    data = grounding.family_suitability(db, project_id)
    if not data:
        return "I couldn't load this project's details."
    parts: list[str] = []
    amenities = data["family_friendly_amenities"]
    if amenities:
        parts.append("Family-friendly amenities: " + ", ".join(a.replace("_", " ") for a in amenities))
    if data["three_bhk_plus_available"]:
        price = grounding.format_inr(data["three_bhk_price_from"])
        parts.append(f"3BHK+ homes are available starting at {price} — comfortable for two children")
    else:
        parts.append("Larger 3BHK+ homes here are sold out; remaining inventory suits smaller families")
    if data["has_kids_play_area"]:
        parts.append("Dedicated kids' play area on-site")
    verdict = "Yes — a solid fit for families." if len(parts) >= 2 else "It can work, with some trade-offs."
    return f"{verdict}\n\n" + "\n".join(f"• {p}" for p in parts)


def _view_reply(db: Session, project_id: Optional[int]) -> str:
    if project_id is None:
        return "Which project? Open it first and I'll pick the unit with the best view."
    best = grounding.best_view_unit(db, project_id)
    if not best:
        return "No available units left in this tower — everything with an upper-floor view is taken."
    line = grounding.render_unit_line(best)
    return (
        f"For the best view, go high: **{best['tower']}**, floor {best['floor']}. Top pick:\n{line}\n\n"
        "Higher floors get wider balconies and unobstructed sightlines. Tap the unit on the "
        "availability grid to explore it."
    )


def _units_reply(db: Session, project_id: Optional[int], bhk: int, max_price: Optional[float]) -> str:
    if project_id is None:
        return _budget_reply(db, max_price or 0, bhk) if (max_price or bhk) else (
            "Open a project and ask about availability — e.g. “any 3BHK available?”."
        )
    units = grounding.find_units(db, project_id, max_price=max_price or 0, bhk=bhk or 0)
    label = f"{bhk}BHK " if bhk else ""
    cap = f" under {grounding.format_inr(max_price)}" if max_price else ""
    if not units:
        return f"No {label}units{cap} are currently available in this project. Want me to show what IS available?"
    header = f"{len(units)} {label}unit(s){cap} available:"
    body = "\n".join(grounding.render_unit_line(u) for u in units[:6])
    more = f"\n…and {len(units) - 6} more." if len(units) > 6 else ""
    return f"{header}\n{body}{more}"


def _amenities_reply(db: Session, project_id: Optional[int]) -> str:
    if project_id is None:
        return "Open a project and I'll list exactly what it offers — pool, gym, clubhouse and more."
    snapshot = grounding.project_snapshot(db, project_id)
    if not snapshot:
        return "I couldn't load this project's details."
    amenities = snapshot["amenities"]
    if not amenities:
        return f"{snapshot['name']} hasn't published its amenity list yet."
    pretty = "\n".join(f"• {a.replace('_', ' ').title()}" for a in amenities)
    return f"Amenities at {snapshot['name']}:\n{pretty}"


def _possession_reply(db: Session, project_id: Optional[int]) -> str:
    if project_id is None:
        return "Ask me about possession once you've opened a project — I'll pull the exact date."
    snapshot = grounding.project_snapshot(db, project_id)
    if not snapshot:
        return "I couldn't load this project's details."
    date_text = snapshot["possession_date"] or "to be announced"
    status = snapshot["status"].replace("_", " ")
    return f"{snapshot['name']} · possession: {date_text} · current status: {status}."


def _location_reply(db: Session, project_id: Optional[int]) -> str:
    if project_id is None:
        return "Tell me which project you're curious about and I'll share where it is."
    snapshot = grounding.project_snapshot(db, project_id)
    if not snapshot:
        return "I couldn't load this project's details."
    place = ", ".join(filter(None, [snapshot["locality"], snapshot["city"]]))
    return f"{snapshot['name']} is located at {place}. {snapshot['description']}".strip()


def _snapshot_summary(db: Session, project_id: int) -> str:
    snapshot = grounding.project_snapshot(db, project_id)
    if not snapshot:
        return "I couldn't load this project's details."
    stats = snapshot["unit_stats"]
    configs = snapshot["available_configurations"]
    config_text = (
        ", ".join(f"{c['bhk']}BHK ({c['available_count']} avail., from {grounding.format_inr(c['price_from'])})" for c in configs)
        or "no open inventory right now"
    )
    return (
        f"{snapshot['name']} — {snapshot['property_type'].replace('_', ' ')} in "
        f"{', '.join(filter(None, [snapshot['locality'], snapshot['city']]))}.\n"
        f"From {grounding.format_inr(snapshot['starting_price']) if snapshot['starting_price'] else 'price on request'} · "
        f"{stats.get('available_units', 0)} of {stats['total']} units available · configurations: {config_text}.\n\n"
        "Try: “Is this good for a family?”, “EMI for 1.5 Cr”, or “best balcony view?”"
    )


def _catalog_overview(db: Session) -> str:
    projects = grounding.search_projects(db)
    if not projects:
        return "Our catalog is being curated — no active projects yet. Ask me anything once listings go live!"
    lines = ["Here's what we're currently showcasing:", *[grounding.render_project_line(p) for p in projects]]
    lines.append("\nOpen any project and ask me about EMIs, family fit, views or unit availability.")
    return "\n".join(lines)


# --- Parsers -------------------------------------------------------------------

def _extract_budget(text: str) -> Optional[float]:
    match = _BUDGET_RE.search(text)
    if match:
        value = float(match.group(1))
        unit = match.group(2).lower()
        return value * 10_000_000 if unit.startswith(("cr", "c")) else value * 100_000
    plain = _PLAIN_BUDGET_RE.search(text.replace(",", ""))
    if plain and ("under" in text.lower() or "below" in text.lower()):
        return float(plain.group(1))
    return None


def _extract_amount(text: str) -> Optional[float]:
    cleaned = text.replace(",", "")
    match = re.search(r"[₹]*\s*(\d+(?:\.\d+)?)\s*(cr|crore|lakhs?|l)\b", cleaned, re.IGNORECASE)
    if match:
        value = float(match.group(1))
        unit = match.group(2).lower()
        return value * 10_000_000 if unit.startswith(("cr", "c")) else value * 100_000
    plain = re.search(r"[₹]\s*(\d{5,9})\b", cleaned)
    if plain:
        return float(plain.group(1))
    return None


def _extract_plain_amount(text: str) -> Optional[float]:
    return _extract_amount(text) if re.search(r"[₹]|cr|lakh|\d{6}", text, re.IGNORECASE) else None


def _extract_bhk(text: str) -> int:
    match = _BHK_RE.search(text)
    return int(match.group(1)) if match else 0
