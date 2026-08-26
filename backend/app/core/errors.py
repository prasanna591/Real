"""RFC 7807 Problem Details error handler for FastAPI.

Returns consistent JSON error responses:
{
    "type": "about:blank",
    "title": "Not Found",
    "status": 404,
    "detail": "Project not found"
}
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def problem_response(status: int, title: str, detail: str, type_url: str = "about:blank") -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "type": type_url,
            "title": title,
            "status": status,
            "detail": detail,
        },
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return problem_response(
            status=exc.status_code,
            title=_status_title(exc.status_code),
            detail=str(exc.detail),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = []
        for err in exc.errors():
            loc = " → ".join(str(l) for l in err["loc"])
            errors.append(f"{loc}: {err['msg']}")
        return problem_response(
            status=422,
            title="Validation Error",
            detail="; ".join(errors),
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        return problem_response(
            status=500,
            title="Internal Server Error",
            detail="An unexpected error occurred." if not app.debug else str(exc),
        )


def _status_title(code: int) -> str:
    titles = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        409: "Conflict",
        422: "Unprocessable Entity",
        429: "Too Many Requests",
        500: "Internal Server Error",
    }
    return titles.get(code, "Error")
