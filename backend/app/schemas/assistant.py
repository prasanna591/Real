from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ChatRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


class ChatMessage(BaseModel):
    role: ChatRole
    content: str = Field(min_length=1, max_length=4000)


class AssistantChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)
    project_id: Optional[int] = None
    session_id: str = ""


class AssistantChatResponse(BaseModel):
    reply: str
    engine: Literal["llm", "grounded"]
    project_id: Optional[int] = None
