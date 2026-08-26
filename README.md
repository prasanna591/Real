# PropTech Platform — Digital Property Experience & Conversion

A digital property experience and conversion platform. Real estate projects become interactive digital experiences where customers can explore, customize, compare and shortlist properties remotely, while developers gain a measurable digital sales channel.

**Concept shorthand:** Google Maps + Airbnb + 3D showroom + property sales assistant, mobile-first.

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Mobile App  │────▶│  Backend API │────▶│  Database   │
│  (Expo/RN)  │     │  (FastAPI)   │     │  (SQLite/PG)│
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
┌─────────────┐            │            ┌─────────────┐
│  Dashboard   │────────────┘            │  AI Engine  │
│  (Next.js)  │                         │ (pydantic-ai│
└─────────────┘                         │  + fallback)│
                                        └─────────────┘
```

## Monorepo Layout

| Directory | Stack | Purpose |
|---|---|---|
| [`backend/`](./backend/) | FastAPI · SQLAlchemy · Alembic | API server, auth, analytics, AI assistant |
| [`mobile/`](./mobile/) | Expo SDK 57 · React Native 0.86 | Customer app (iOS, Android, web) |
| [`dashboard/`](./dashboard/) | Next.js 16 · React 19 · Tailwind CSS 4 | Builder web console |

---

## Quick Start

### Backend (Terminal 1)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Start PostgreSQL (optional, SQLite works for dev)
docker compose up -d db

# Run migrations
alembic upgrade head

# Seed demo data
python scripts/seed.py
python scripts/create_builder.py "Acme Builders" builder@acme.com secret123

# Start server
uvicorn app.main:app --reload
# → http://localhost:8000/docs
```

### Mobile App (Terminal 2)

```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

> Android emulator: `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000`
> iOS simulator / web: `http://localhost:8000`

### Builder Dashboard (Terminal 3)

```bash
cd dashboard
npm install
cp .env.example .env.local
npm run dev
# → http://localhost:3000
```

Sign in at `http://localhost:3000/login` with `builder@acme.com` / `secret123`.

---

## Backend

### API Endpoints

| Prefix | Auth | Description |
|---|---|---|
| `POST /api/v1/auth/register` | — | Register builder account |
| `POST /api/v1/auth/login` | — | Login, get JWT |
| `GET /api/v1/auth/me` | ✅ | Current builder profile |
| `GET /api/v1/projects` | — | List active projects (paginated) |
| `POST /api/v1/projects` | ✅ | Create project |
| `GET /api/v1/projects/{id}` | — | Project detail |
| `PATCH /api/v1/projects/{id}` | ✅ | Update project |
| `DELETE /api/v1/projects/{id}` | ✅ | Delete project |
| `GET/POST/... /projects/{id}/towers` | Mixed | Tower CRUD |
| `GET/POST/... /projects/{id}/towers/{id}/floors` | Mixed | Floor CRUD |
| `GET/POST/... /floors/{id}/units` | Mixed | Unit CRUD |
| `GET/POST/... /projects/{id}/tour/viewpoints` | Mixed | 3D tour viewpoints |
| `GET/POST/... /projects/{id}/media` | Mixed | Media assets |
| `POST /api/v1/users` | — | Customer sign-in (idempotent) |
| `POST/GET/DELETE /api/v1/saved` | — | Save/unsave projects |
| `POST /api/v1/enquiries` | — | Submit enquiry |
| `GET/PATCH /api/v1/enquiries` | ✅ | List/update enquiries |
| `POST /api/v1/enquiries/{id}/notes` | ✅ | Add enquiry notes |
| `GET /api/v1/enquiries/{id}/notes` | ✅ | List enquiry notes |
| `POST /api/v1/site-visits` | — | Book site visit |
| `GET/PATCH /api/v1/site-visits` | ✅ | List/update site visits |
| `POST /api/v1/analytics/events` | — | Track analytics event |
| `GET /api/v1/projects/{id}/analytics/summary` | ✅ | Analytics summary |
| `GET /api/v1/builder/projects` | ✅ | Builder portfolio (scoped) |
| `GET /api/v1/builder/analytics` | ✅ | Portfolio analytics (scoped) |
| `GET /api/v1/builder/projects/{id}/pipeline` | ✅ | Lead pipeline (scoped) |
| `POST /api/v1/uploads/presign` | ✅ | Get S3 presigned upload URL |
| `POST /api/v1/uploads/register` | ✅ | Register uploaded file as media |
| `POST /api/v1/assistant/chat` | — | AI property assistant |
| `GET /api/v1/assistant/status` | — | Assistant engine status |
| `GET /health` | — | Health check (DB ping) |

### Environment Variables

```bash
# Core
DEBUG=true
DATABASE_URL=sqlite:///./proptech.db
# DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/proptech

# CORS (comma-separated origins, or empty for localhost defaults)
CORS_ORIGINS=

# Auth
JWT_SECRET_KEY=change-me-in-production  # openssl rand -hex 32
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=720

# AI Assistant
OPENAI_API_KEY=          # optional — enables LLM agent
AI_MODEL=                # optional — e.g. "openai:gpt-4o-mini"

# Storage (S3)
S3_ENDPOINT_URL=
S3_BUCKET=proptech-media
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Observability
SENTRY_DSN=              # optional — enables error tracking
REDIS_URL=redis://localhost:6379  # for background jobs
```

### Database & Migrations

```bash
# PostgreSQL via Docker
docker compose up -d db

# Generate migration after model changes
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

### Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

**Test suite:** 49 tests covering auth, projects, engagement, builder dashboard, and AI assistant.

---

## Security Features

- **JWT authentication** with bcrypt password hashing
- **Rate limiting**: 5/hour on registration, 10/minute on login, 30/minute on AI chat
- **CORS lockdown**: configurable allowed origins (not `*`)
- **Production secret enforcement**: app refuses to start with default JWT key in production
- **Input validation**: phone number regex, email format validation, field sanitization
- **Multi-tenancy**: builders can only manage their own projects
- **Health check**: database connectivity ping with response time header
- **RFC 7807 errors**: consistent JSON error format across all endpoints
- **Debug mode controls**: docs/OpenAPI disabled when `DEBUG=false`

---

## Logging & Observability

- **Structured logging** via `structlog` — JSON lines in production, pretty console in dev
- **Request correlation**: every request gets a `X-Request-ID` header
- **Response timing**: `X-Response-Time` header on all responses
- **Sentry integration**: error tracking and performance monitoring (set `SENTRY_DSN`)

---

## AI Property Assistant

Two-tier architecture:

1. **LLM Agent** (when `OPENAI_API_KEY` is set): pydantic-ai agent with DB-grounded tools
2. **Deterministic Fallback** (always available): regex-based intent routing → grounded queries

Capabilities:
- Budget search ("Show me apartments under 1.5 Cr")
- EMI calculation ("What's the EMI for ₹1.25 crore?")
- Family suitability ("Is this good for a family with two children?")
- Best view selection ("Which unit has the best balcony view?")
- Unit availability with filters (BHK, price, facing)
- Project factsheets and amenity listings

Every assistant turn is tracked as an `assistant_message` analytics event.

---

## File Uploads (S3)

Direct-to-S3 upload flow (no file touches our server):

```bash
# 1. Get presigned URL
POST /api/v1/uploads/presign
{"content_type": "image/jpeg", "filename": "render.jpg", "project_id": 1}

# 2. Upload directly to S3
PUT <upload_url> (with file binary)

# 3. Register the asset
POST /api/v1/uploads/register
{"project_id": 1, "media_type": "photo", "title": "Facade", "file_key": "projects/1/uuid.jpg"}
```

---

## Background Jobs

ARQ worker for async tasks (requires Redis):

```bash
# Start Redis
docker compose up -d redis

# Start worker
arq app.core.jobs.WorkerSettings
```

Tasks:
- `send_enquiry_notification` — notify builder on new enquiry
- `send_visit_reminder` — reminder before site visit
- `aggregate_analytics` — daily analytics aggregation (cron at 3:00 and 15:00 UTC)

---

## External Libraries Used

| Library | Purpose | Stars |
|---|---|---|
| `slowapi` | Rate limiting | FastAPI-native |
| `structlog` | Structured logging | 2.4k |
| `sentry-sdk` | Error tracking | Official |
| `boto3` | S3 uploads | AWS SDK |
| `alembic` | DB migrations | SQLAlchemy-native |
| `pydantic-ai` | AI assistant | Typed tools |
| `phonenumbers` | Phone validation | Google's lib |
| `email-validator` | Email validation | Pydantic's backend |
| `arq` | Background jobs | Async Redis |

Full strategy: see [`backend/STRATEGY.md`](./backend/STRATEGY.md)

---

## Development Roadmap

### Phase 1 — Core Experience ✅
Property discovery, 3D walkthrough, unit grid, save/enquire/book, builder console v1, analytics foundation.

### Phase 2 — Intelligence & Personalization ✅
AI assistant v1, builder web dashboard, rate limiting, Alembic migrations, 49 tests, N+1 query fixes, input validation.

### Phase 3 — API Hardening ✅
RFC 7807 errors, structured logging (structlog), Sentry integration, multi-tenancy, S3 uploads, background jobs (ARQ).

### Phase 4 — Immersive Depth (Next)
Cinematic walkthrough, interactive rooms, "Customize My Home", unit-aware 3D tours.

### Phase 5 — Production Scale
PostgreSQL production switch, OTP verification, email/WhatsApp notifications, analytics materialized views.

### Phase 6 — Platform
White-label builder tooling, multi-tenant ownership, advanced analytics & attribution.

---

## Testing the Backend via ngrok

```bash
# Start backend
uvicorn app.main:app --reload

# Expose via ngrok
ngrok http 8000

# Point mobile app at ngrok URL
EXPO_PUBLIC_API_URL=https://a1b2-xx.ngrok-free.app npx expo start
```

---

## License

Proprietary — All rights reserved.
