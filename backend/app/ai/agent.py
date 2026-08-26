"""LLM property assistant built on pydantic-ai (https://github.com/pydantic/pydantic-ai).

The agent answers strictly from live listing data via typed tools; every tool
is grounded in the same query layer the deterministic fallback engine uses.
If no API key / model is configured, callers fall back to app.ai.fallback.
"""

import logging
import os
from dataclasses import dataclass
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.ai import grounding
from app.core.config import get_settings

logger = logging.getLogger(__name__)

MAX_HISTORY_MESSAGES = 12


@dataclass
class AssistantDeps:
    db: Session
    project_id: Optional[int] = None


def resolved_model_string() -> str:
    """Model identifier for the agent, or '' when only the fallback engine can run."""
    settings = get_settings()
    if settings.ai_model:
        return settings.ai_model
    if settings.openai_api_key:
        return "openai:gpt-4o-mini"
    return ""


_agent = None


def get_agent():
    """Lazily construct the singleton Agent (None when no model configured)."""
    global _agent
    from pydantic_ai import Agent

    model = resolved_model_string()
    if not model:
        return None
    if _agent is None:
        settings = get_settings()
        os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)
        _agent = Agent(
            model,
            deps_type=AssistantDeps,
            output_type=str,
            instructions=_system_instructions,
            retries=1,
            name="property_assistant",
        )
        _register_tools(_agent)
    return _agent


# --- Instructions ---------------------------------------------------------------

def _system_instructions(ctx) -> str:
    deps: AssistantDeps = ctx.deps
    base = (
        "You are the AI Property Assistant inside a real-estate experience platform. "
        "You help home buyers explore projects, compare options, understand pricing/EMI "
        "and decide which home fits their family.\n\n"
        "RULES:\n"
        "1. GROUND EVERY FACT in tool results or the project snapshot below. Never invent "
        "prices, unit numbers, availability, dates or amenities.\n"
        "2. If data doesn't answer the question, say so and suggest booking a site visit.\n"
        "3. Be warm, concise and mobile-chat friendly (short paragraphs, bullets). "
        "Use ₹ crore/lakh formatting for INR amounts.\n"
        "4. Nudge toward the next step in the journey when relevant: view units, save the "
        "project, enquire, or book a site visit."
    )
    snapshot_text = ""
    if deps.project_id is not None:
        snapshot = grounding.project_snapshot(deps.db, deps.project_id)
        if snapshot:
            snapshot_text = "\n\nCURRENT PROJECT CONTEXT (the user is viewing this project):\n" + _format_snapshot(snapshot)
    return base + snapshot_text


def _format_snapshot(snapshot: dict[str, Any]) -> str:
    stats = snapshot["unit_stats"]
    configs = "; ".join(
        f"{c['bhk']}BHK ×{c['available_count']} available from ₹{c['price_from']:,.0f}"
        for c in snapshot["available_configurations"]
    ) or "none"
    price = f"₹{snapshot['starting_price']:,.0f}" if snapshot.get("starting_price") else "on request"
    return (
        f"name={snapshot['name']}; type={snapshot['property_type']}; location="
        f"{snapshot['locality']}, {snapshot['city']}; starting_price={price}; "
        f"possession={snapshot['possession_date']}; amenities={snapshot['amenities']}; "
        f"units_total={stats['total']}; available={stats.get('available_units', 0)}; "
        f"available_configs=[{configs}]"
    )


# --- Tools -----------------------------------------------------------------------

def _register_tools(agent) -> None:
    @agent.tool
    def search_projects(
        ctx,
        city: str = "",
        property_type: str = "",
        max_budget_inr: float = 0,
        min_bhk: int = 0,
    ) -> list[dict[str, Any]]:
        """Search active projects across the catalog.

        Args:
            city: City name filter (substring match), e.g. "Chennai". Empty = any city.
            property_type: One of luxury_apartment | villa | premium_residence | waterfront. Empty = any.
            max_budget_inr: Budget ceiling in rupees (e.g. 15000000 for 1.5 Cr). 0 = ignore.
            min_bhk: Require at least one available unit with this many bedrooms. 0 = ignore.
        """
        return grounding.search_projects(
            ctx.deps.db,
            city=city,
            property_type=property_type,
            max_budget=max_budget_inr,
            min_bhk=min_bhk,
        )

    @agent.tool
    def project_facts(ctx) -> dict[str, Any]:
        """Full factsheet of the project the user is viewing: specs, amenities, possession, unit stats."""
        if ctx.deps.project_id is None:
            return {"error": "No specific project is open. Use search_projects instead."}
        return grounding.project_snapshot(ctx.deps.db, ctx.deps.project_id)

    @agent.tool
    def list_available_units(
        ctx,
        bhk: int = 0,
        max_price_inr: float = 0,
        facing: str = "",
        status: str = "available",
    ) -> list[dict[str, Any]]:
        """List units in the current project with tower/floor details and prices.

        Args:
            bhk: Exact bedroom count (2 for 2BHK). 0 = any.
            max_price_inr: Price ceiling in rupees. 0 = ignore.
            facing: Facing direction filter like "east", "north-east". Empty = any.
            status: available | booked | sold | any.
        """
        if ctx.deps.project_id is None:
            return [{"error": "No specific project is open. Use search_projects instead."}]
        return grounding.find_units(
            ctx.deps.db,
            ctx.deps.project_id,
            max_price=max_price_inr,
            bhk=bhk,
            facing=facing,
            status=status,
            limit=12,
        )

    @agent.tool
    def best_view_unit(ctx) -> dict[str, Any]:
        """Pick the available unit with the best view (highest floor, largest area tie-break)."""
        if ctx.deps.project_id is None:
            return {"error": "No specific project is open."}
        result = grounding.best_view_unit(ctx.deps.db, ctx.deps.project_id)
        return result or {"note": "No available units remain."}

    @agent.tool_plain
    def calculate_emi(principal_inr: float, interest_rate_pct: float = 8.5, tenure_years: int = 20) -> dict[str, Any]:
        """Compute a reducing-balance home-loan EMI.

        Args:
            principal_inr: Loan amount in rupees.
            interest_rate_pct: Annual interest rate in percent (default 8.5).
            tenure_years: Loan tenure in years (default 20).
        """
        try:
            return grounding.calculate_emi(principal_inr, interest_rate_pct, tenure_years)
        except ValueError as exc:
            return {"error": str(exc)}


# --- History conversion -----------------------------------------------------------

def build_message_history(messages: list[dict[str, str]]):
    """Convert [{role, content}] turns into pydantic-ai ModelMessage history.

    The final user turn should be passed as the run prompt instead.
    """
    from pydantic_ai.messages import ModelRequest, ModelResponse, TextPart, UserPromptPart

    history = []
    for message in messages:
        content = (message.get("content") or "").strip()
        if not content:
            continue
        if message.get("role") == "user":
            history.append(ModelRequest(parts=[UserPromptPart(content=content)]))
        else:
            history.append(ModelResponse(parts=[TextPart(content=content)]))
    return history


async def run_assistant(db: Session, user_message: str, history_messages: list[dict[str, str]], project_id: Optional[int] = None) -> str:
    """Run one agent turn. Raises on failure — caller falls back to the rule engine."""
    agent = get_agent()
    if agent is None:
        raise RuntimeError("No LLM model configured")
    trimmed = history_messages[-MAX_HISTORY_MESSAGES:]
    history = build_message_history(trimmed)
    result = await agent.run(
        user_message,
        deps=AssistantDeps(db=db, project_id=project_id),
        message_history=history or None,
    )
    return result.output
