# PropTech Backend — Optimal Library Strategy

## Philosophy
Use battle-tested, FastAPI-native libraries. Minimize custom code. Every dependency
should have >1k GitHub stars, active maintenance, and first-class FastAPI/SQLAlchemy support.

## External Libraries (selected for this project)

### Tier 1 — Must-have (production-grade backend)

| Library | Purpose | Why this one |
|---|---|---|
| **slowapi** | Rate limiting | Already integrated. Built on `limits`. FastAPI-native decorator. |
| **structlog** | Structured logging | JSON output, context merging, stdlib-compatible. 2.4k stars. |
| **sentry-sdk** | Error tracking | Free tier, FastAPI integration out of box, performance tracing. |
| **boto3** | S3 uploads | AWS SDK. Presigned URLs = no server-side file handling. |
| **alembic** | Migrations | Already integrated. SQLAlchemy-native. The only choice. |
| **pydantic-ai** | AI assistant | Already integrated. Typed tools, DB grounding, multi-provider. |
| **python-multipart** | File uploads | Already a dependency. Required by FastAPI for form data. |

### Tier 2 — Recommended (quality of life)

| Library | Purpose | Why this one |
|---|---|---|
| **arq** | Async background jobs | Redis-based, asyncio-native, cron support. 1.2k stars. Lighter than Celery. |
| **httpx** | Async HTTP client | For calling external APIs (maps, WhatsApp). Already in requirements. |
| **phonenumbers** | Phone validation | Google's lib. Replaces regex. Handles IN/intl formats. 2.7k stars. |
| **email-validator** | Email validation | Pydantic's recommended backend. Replaces regex. |

### Tier 3 — Future (Phase 5+)

| Library | Purpose | When |
|---|---|---|
| ** celery + redis** | Distributed tasks | Only if arq proves insufficient at scale |
| **opentelemetry** | Distributed tracing | When adding microservices |
| **pgvector** | Semantic search | For AI-powered property recommendations |

## Architecture Decisions

1. **Error format**: RFC 7807 Problem Details (JSON `{"type", "title", "status", "detail"}`)
2. **Logging**: structlog → JSON lines → file/stdout. Request ID middleware for correlation.
3. **Uploads**: Client → presigned S3 URL → direct upload → callback. No file touches our server.
4. **Background jobs**: arq worker running alongside uvicorn. Jobs: email notifications, analytics aggregation.
5. **Multi-tenancy**: `builder_id` FK on `projects`. All builder-scoped queries filter by this.
6. **Phone validation**: `phonenumbers` library replaces regex for IN/international formats.

## Migration Path
Each phase adds libraries incrementally. No big-bang rewrites. Old behavior preserved.
