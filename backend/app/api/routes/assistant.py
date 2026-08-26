import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.ai import agent as ai_agent
from app.ai import fallback
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models import EventType, Project
from app.schemas import AssistantChatRequest, AssistantChatResponse
from app.api.routes.engagement import _log

router = APIRouter(prefix="/assistant", tags=["assistant"])
logger = logging.getLogger(__name__)


@router.post("/chat", response_model=AssistantChatResponse)
@limiter.limit("30/minute")
async def chat(request: Request, payload: AssistantChatRequest, db: Session = Depends(get_db)):
    """AI property assistant — grounded in live listing data.

    Uses the LLM agent when a model is configured; otherwise (or on failure)
    answers via the deterministic DB-grounded engine.
    """
    user_messages = [m for m in payload.messages if m.role.value == "user"]
    if not user_messages:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "At least one user message is required")
    last_user_message = user_messages[-1].content.strip()

    if payload.project_id is not None and not db.get(Project, payload.project_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    reply: str | None = None
    engine = "grounded"
    if ai_agent.resolved_model_string():
        try:
            history = [
                {"role": m.role.value, "content": m.content} for m in payload.messages[:-1]
            ]
            reply = await ai_agent.run_assistant(db, last_user_message, history, payload.project_id)
            engine = "llm"
        except Exception:
            logger.exception("LLM assistant failed; falling back to grounded engine")

    if reply is None:
        reply = fallback.answer(db, last_user_message, payload.project_id)

    _log(db, EventType.ASSISTANT_MESSAGE, payload.project_id, None, payload.session_id)
    db.commit()

    return AssistantChatResponse(reply=reply, engine=engine, project_id=payload.project_id)


@router.get("/status")
def assistant_status():
    return {"llm_enabled": bool(ai_agent.resolved_model_string()), "fallback": "db-grounded rule engine"}
