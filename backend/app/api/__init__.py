from fastapi import APIRouter

from app.api.routes import (
    assistant,
    auth,
    builder,
    engagement,
    projects,
    room_scans,
    uploads,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(engagement.router)
api_router.include_router(builder.router)
api_router.include_router(assistant.router)
api_router.include_router(uploads.router)
api_router.include_router(room_scans.router)
