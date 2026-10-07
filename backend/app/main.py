import time
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text

from app.api import api_router
from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.core.errors import register_error_handlers
from app.core.logging import generate_request_id, setup_logging
from app.core.rate_limit import limiter, rate_limit_exceeded_handler

settings = get_settings()
logger = structlog.get_logger()

if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,
        environment="production" if not settings.debug else "development",
    )


def _check_db_health() -> dict:
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return {"database": "ok"}
    except Exception as exc:
        return {"database": f"error: {exc}"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(debug=settings.debug)
    logger.info("startup", version=app.version, debug=settings.debug)
    Base.metadata.create_all(bind=engine)
    yield
    logger.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description=(
            "Digital property experience & conversion platform API.\n\n"
            "**Features:**\n"
            "- Project, tower, floor, and unit management\n"
            "- Media asset registry (3D, floor plans, photos, 360°, AR)\n"
            "- Customer engagement: saves, enquiries, site visits\n"
            "- Follow builders and a personalised property feed\n"
            "- Analytics event tracking with conversion funnel\n"
            "- AI property assistant (LLM + deterministic fallback)\n"
            "- Builder dashboard with lead pipeline\n\n"
            "**Auth:** JWT Bearer token via `/api/v1/auth/login`"
        ),
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        openapi_url="/openapi.json" if settings.debug else None,
        debug=settings.debug,
        lifespan=lifespan,
        openapi_tags=[
            {"name": "auth", "description": "Builder registration and login"},
            {"name": "projects", "description": "Property project CRUD with tower/floor/unit hierarchy"},
            {"name": "engagement", "description": "Customer saves, enquiries, site visits, and analytics"},
            {"name": "social", "description": "Follow builders and the personalised property feed"},
            {"name": "builder", "description": "Builder dashboard: portfolio, pipeline, and analytics"},
            {"name": "assistant", "description": "AI property assistant chat"},
            {"name": "meta", "description": "Health check and API info"},
        ],
    )

    app.state.limiter = limiter
    app.add_exception_handler(429, rate_limit_exceeded_handler)
    register_error_handlers(app)

    # SlowAPI must wrap the app so its default/global limits apply to routes
    # that don't carry their own @limiter decorator.
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def add_timing_and_logging(request: Request, call_next):
        request_id = generate_request_id()
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{elapsed_ms}ms"

        # Hardening for user-uploaded files served from /media: never let a
        # browser sniff an attacker-controlled file as HTML/executable.
        if request.url.path.startswith("/media/"):
            response.headers.setdefault("X-Content-Type-Options", "nosniff")
            response.headers.setdefault("Content-Security-Policy", "default-src 'none'")

        logger.info(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=elapsed_ms,
        )
        return response

    app.include_router(api_router)

    settings.media_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")

    @app.get("/", tags=["meta"])
    def root():
        return {
            "name": settings.app_name,
            "version": app.version,
            "description": app.description,
            "docs": "/docs",
            "openapi": "/openapi.json",
            "health": "/health",
            "api_base": "/api/v1",
        }

    @app.get("/health", tags=["meta"])
    def health():
        db_health = _check_db_health()
        status = "ok" if db_health["database"] == "ok" else "degraded"
        return JSONResponse(
            status_code=200 if status == "ok" else 503,
            content={
                "status": status,
                "database": db_health["database"],
                "version": app.version,
            },
        )

    return app


app = create_app()
