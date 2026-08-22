# PropTech API

FastAPI backend for the PropTech platform — digital property experience & conversion API.

- **Stack:** Python 3.12 · FastAPI 0.115 · SQLAlchemy 2.0 · Pydantic v2 · SQLite (PostgreSQL-ready) · bcrypt + PyJWT
- **Base path:** all routes mounted under `/api/v1`
- **Interactive docs:** `http://localhost:8000/docs` (Swagger UI)

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then adjust values
uvicorn app.main:app --reload
```

The database (`proptech.db`) is created automatically on startup via `Base.metadata.create_all`.

### Scripts

| Script | Purpose |
|---|---|
| `python scripts/seed.py` | Reset + seed demo data (Aurora Skyline project, towers, floors, units, media) |
| `python scripts/create_builder.py "<name>" <email> <password>` | Create a builder account for the dashboard/auth |

## Environment Variables (`.env`)

| Key | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./proptech.db` | Use PostgreSQL in production |
| `DEBUG` | `true` | Disable in production |
| `JWT_SECRET_KEY` | `change-me-in-production` | **Set a real secret before deploying** — `openssl rand -hex 32` |
| `JWT_ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `720` | Token lifetime |
| `S3_*`, `POSTHOG_KEY`, `OPENAI_API_KEY` | empty | Reserved for upcoming phases |

## Authentication

Two identity models:

1. **Customers** — passwordless. `POST /api/v1/users` is an idempotent sign-in by phone number. No token involved; the mobile app stores the returned user profile locally.
2. **Builders/admins** — JWT bearer auth. Register or create via script, login returns `{access_token}`, send as `Authorization: Bearer <token>`. All builder-side write/list endpoints require it.

```bash
# register (first time)
curl -X POST localhost:8000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Acme","email":"builder@acme.com","password":"secret123"}'

# login
curl -X POST localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"builder@acme.com","password":"secret123"}'

# authenticated call
curl localhost:8000/api/v1/projects -H "Authorization: Bearer <token>"
```

## Endpoint Reference

🔒 = requires builder JWT · everything else is public (customer-facing)

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create builder account (409 if email exists) |
| POST | `/auth/login` | → `{access_token, token_type}` |
| GET 🔒 | `/auth/me` | Current builder profile |

### Catalog
| Method | Path | Description |
|---|---|---|
| GET | `/projects?property_type&city&status` | Public catalog (drafts excluded; defaults to active) |
| POST 🔒 | `/projects` | Create project (unique slug) |
| GET | `/projects/{id}` | Single project |
| PATCH 🔒 / DELETE 🔒 | `/projects/{id}` | Update / delete (cascades children) |
| GET / POST 🔒 | `/projects/{id}/towers` | List / create towers |
| GET / POST 🔒 | `/projects/{id}/towers/{tower_id}/floors` | List / create floors |
| GET | `/projects/{id}/units?status&min_bhk&max_price` | Units across towers, ordered tower→floor→unit |
| GET | `/projects/{id}/units/{unit_id}` | Single unit (validates hierarchy) |
| POST 🔒 | `/projects/{id}/towers/{tower_id}/floors/{floor_id}/units` | Create unit |
| PATCH 🔒 | `/projects/{id}/units/{unit_id}` | Update unit (price/status/bhk…) |
| GET | `/projects/{id}/media?media_type` | Media assets (model_3d, floor_plan, photo, capture_360, ar_pack, interior_set) |
| POST 🔒 | `/projects/{id}/media` | Register media asset by URL |

### Engagement (customer)
| Method | Path | Description |
|---|---|---|
| POST | `/users` | Passwordless sign-in/create by phone (idempotent) |
| POST | `/saved` | Save project and/or unit (deduped; logs `save` event) |
| GET | `/users/{user_id}/saved` | List shortlist |
| DELETE | `/saved/{item_id}?session_id=` | Remove from shortlist (logs `unsave`) |
| POST | `/enquiries` | Submit enquiry (logs `enquiry` event) |
| POST | `/site-visits` | Book site visit (logs `site_visit_booked` event) |
| POST | `/analytics/events` | Track client event (202; types: view, walkthrough_complete, save, unsave, enquiry, site_visit_booked, booking) |

### Engagement (builder) 🔒
| Method | Path | Description |
|---|---|---|
| GET 🔒 | `/enquiries?project_id` | Lead inbox (newest first) |
| PATCH 🔒 | `/enquiries/{id}` | Move pipeline: new → contacted → qualified → site_visit → booked → closed (`booked` logs `booking` event) |
| GET 🔒 | `/site-visits?project_id` | Visits by schedule |
| GET 🔒 | `/projects/{id}/analytics/summary` | `{property_views, serious_explorers, saves, enquiries, site_visits}` |

## Project Structure

```
app/
├── main.py                 App factory, CORS, startup table creation
├── api/
│   ├── deps.py             get_current_builder dependency (OAuth2 bearer)
│   └── routes/
│       ├── auth.py         register / login / me
│       ├── projects.py     catalog hierarchy + media
│       └── engagement.py   users, saved, enquiries, visits, analytics
├── core/
│   ├── config.py           pydantic-settings (.env)
│   ├── database.py         engine, SessionLocal, get_db
│   └── security.py         bcrypt hash/verify, JWT encode/decode
├── models/                 SQLAlchemy 2.0 Mapped[] models (10 tables)
└── schemas/                Pydantic request/response models
```

**Models:** `Project → Tower → Floor → Unit`, `MediaAsset`, `CustomerUser`, `SavedItem`, `Enquiry`, `SiteVisit`, `AnalyticsEvent` (append-only), `BuilderUser`.

## Known Gaps / Roadmap

- No Alembic migrations yet (`create_all` only) — add before switching to PostgreSQL
- Media registration is URL-only — S3 presigned upload endpoint planned
- CORS allows all origins (`main.py`) — tighten per environment
- No rate limiting on public write endpoints (enquiries)
- No automated test suite (verified via scripted smoke tests so far)
