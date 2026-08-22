from fastapi import APIRouter

from app.api.routes import auth, builder, engagement, projects

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(engagement.router)
api_router.include_router(builder.router)
