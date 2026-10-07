# PropTech API

FastAPI backend for the PropTech platform — digital property experience & conversion API.

- **Stack:** Python 3.12 · FastAPI 0.115 · SQLAlchemy 2.0 · Pydantic v2 · SQLite (PostgreSQL-ready) · bcrypt + PyJWT (structlog, slowapi, sentry-sdk optional)
- **Base path:** all routes mounted under `/api/v1`
- **Interactive docs:** `http://localhost:8000/docs` (Swagger UI)
- **Social layer:** per-project save/view counters, trending sort (`?sort=trending`), share-attribution events, **builder follow + timeline feed**, customer listing requests, room-scan sync
- **Media:** local disk under `media/` served at `/media` (S3 presigned flow available but not default)

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
| `S3_*`, `POSTHOG_KEY` | empty | Reserved for upcoming phases |
| `OPENAI_API_KEY` | empty | Enables the LLM-powered assistant (with `AI_MODEL`) |
| `AI_MODEL` | auto | pydantic-ai model string, e.g. `openai:gpt-4o-mini`. Empty → `openai:gpt-4o-mini` when an OpenAI key is set; with neither, the deterministic DB-grounded fallback engine answers |

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
| PATCH 🔒 / DELETE 🔒 | `/projects/{id}/towers/{tower_id}` | Rename tower / delete (cascades floors + units) |
| GET / POST 🔒 | `/projects/{id}/towers/{tower_id}/floors` | List / create floors |
| PATCH 🔒 / DELETE 🔒 | `/projects/{id}/towers/{tower_id}/floors/{floor_id}` | Renumber floor / delete (cascades units) |
| GET | `/projects/{id}/units?status&min_bhk&max_price&floor_id` | Units across towers, ordered tower→floor→unit |
| GET | `/projects/{id}/units/{unit_id}` | Single unit (validates hierarchy) |
| POST 🔒 | `/projects/{id}/towers/{tower_id}/floors/{floor_id}/units` | Create unit |
| PATCH 🔒 / DELETE 🔒 | `/projects/{id}/units/{unit_id}` | Update unit (price/status/bhk…) / delete unit |
| GET | `/projects/{id}/media?media_type` | Media assets (model_3d, floor_plan, photo, capture_360, ar_pack, interior_set) |
| POST 🔒 / DELETE 🔒 | `/projects/{id}/media/{asset_id}` | Register media asset by URL / remove it |

### Engagement (customer)
| Method | Path | Description |
|---|---|---|
| POST | `/users` | Passwordless sign-in/create by phone (idempotent) |
| POST | `/saved` | Save project and/or unit — client may send both; unit wins, project_id is normalised from the unit's hierarchy (deduped; logs `save` event) |
| GET | `/users/{user_id}/saved` | List shortlist |
| DELETE | `/saved/{item_id}?session_id=` | Remove from shortlist (logs `unsave`) |
| POST | `/enquiries` | Submit enquiry (logs `enquiry` event) |
| POST | `/site-visits` | Book site visit (logs `site_visit_booked` event) |
| POST | `/listing-requests` | Customer "post my property" → pending lead (links `CustomerUser` by phone) |
| POST | `/listing-requests/{id}/images` | Multipart image upload → `media/listing-photos`, URLs appended to the request |
| POST | `/analytics/events` | Track client event (202; types: view, walkthrough_complete, save, unsave, enquiry, site_visit_booked, booking, assistant_message) |

### Social (customer) — builder follow & feed
| Method | Path | Description |
|---|---|---|
| GET | `/builders` | Followable builders (suggestions with profile + counts) → `BuilderCard[]` |
| POST | `/follows` | Follow a builder (`userId` + `builderId`) → `FollowRead` (201) |
| DELETE | `/follows` | Unfollow (204); safe when nothing follows |
| GET | `/users/{user_id}/following` | Builders a user follows → `BuilderCard[]` |
| GET | `/feed` | Timeline: new/updated projects + unit drops from followed builders, newest first; respects login-session vs user_id filtering |

### Room scans (customer)
| Method | Path | Description |
|---|---|---|
| POST | `/room-scans` | Multipart keyframe-photo upload + metadata → stored under `media/room-scans/`; **idempotent** by `client_scan_id` |
| GET | `/room-scans?project_id=` | List synced scans |

### AI assistant
| Method | Path | Description |
|---|---|---|
| POST | `/assistant/chat` | Grounded Q&A over live listing data (budget search, units, EMI, family fit, views). Uses the pydantic-ai LLM agent when `AI_MODEL`/`OPENAI_API_KEY` is set; otherwise a deterministic DB-grounded rule engine answers. Logs `assistant_message` per turn. |
| GET | `/assistant/status` | `{llm_enabled, fallback}` |

### Engagement (builder) 🔒
| Method | Path | Description |
|---|---|---|
| GET 🔒 | `/enquiries?project_id` | Lead inbox (newest first) |
| GET | `/enquiries/me?phone=` | **Customer-facing** enquiry status lookup (matches phone used at sign-in; includes `project_name` + `status`) |
| PATCH 🔒 | `/enquiries/{id}` | Move pipeline: new → contacted → qualified → site_visit → booked → closed (`booked` logs `booking` event) |
| GET 🔒 | `/site-visits?project_id` | Visits by schedule |
| PATCH 🔒 | `/site-visits/{id}` | Update visit: status (scheduled/completed/cancelled) and/or `scheduled_at` |
| GET 🔒 | `/projects/{id}/analytics/summary` | `{property_views, serious_explorers, saves, enquiries, site_visits, assistant_messages}` |

### Builder console 🔒
| Method | Path | Description |
|---|---|---|
| GET 🔒 | `/builder/projects` | All projects with unit counts + availability |
| GET 🔒 | `/builder/projects/{id}/pipeline` | Enquiries + site visits for one project |

## Project Structure

```
app/
├── main.py                 App factory, CORS, startup table creation, /media static mount
├── ai/
│   ├── agent.py            pydantic-ai agent (typed DB-grounded tools)
│   ├── fallback.py         deterministic intent engine (no LLM key needed)
│   └── grounding.py        shared query layer: search/snapshot/units/EMI
├── api/
│   ├── deps.py             get_current_builder dependency (OAuth2 bearer)
│   └── routes/
│       ├── auth.py         register / login / me
│       ├── projects.py     catalog hierarchy + media (list/detail batch cover_url)
│       ├── engagement.py   users, saved, enquiries, visits, listing-requests, analytics
│       ├── social.py       builder follow, following list, timeline feed
│       ├── room_scans.py   scan upload + listing
│       ├── builder.py      builder portfolio/analytics/pipeline
│       ├── assistant.py    POST /assistant/chat, GET /assistant/status
│       └── uploads.py      S3 presign + register (optional)
├── core/
│   ├── config.py           pydantic-settings (.env)
│   ├── database.py         engine, SessionLocal, get_db
│   ├── security.py         bcrypt hash/verify, JWT encode/decode
│   └── uploads.py          local/UPLOAD target + presign helpers
├── models/                 SQLAlchemy 2.0 Mapped[] models
└── schemas/                Pydantic request/response models
```

**Models:** `Project → Tower → Floor → Unit`, `MediaAsset`, `TourViewpoint`, `CustomerUser`, `BuilderUser`, `BuilderFollow`, `SavedItem`, `Enquiry`(+notes), `SiteVisit`, `AnalyticsEvent` (append-only), `ListingRequest`, `RoomScan`.

**N+1 guard:** `GET /projects` and `GET /projects/{id}` attach each project's `cover_url` from a single batched photo query (`_attach_cover_url`) — card lists never re-query media per item.

**Performance guards:** with `slowapi`, hotspot endpoints carry `@limiter.limit(...)` (e.g. 120/hour on `POST /users`, 60/minute on `POST /saved`, 20/hour on listing-requests, 10/minute on login).

## Known Gaps / Roadmap

- Customer save/enquiry endpoints are unauth'd by design and keyed on caller-supplied IDs — a real customer session token is the longer-term fix
- Room-scan/local asset files live on disk; swap in the S3 presigned-upload flow for production
- Alembic migrations cover the optional unit_id/FKs and current models, but keep `create_all` as the source of truth until moving to PostgreSQL

## Testing

Run the suites with:

```bash
./.venv/bin/python -m pytest tests/        # 94 tests: auth, projects, units,
                                           # media upload, room scans, engagement (+
                                           # my-enquiries-by-phone),
                                           # social proof (counters/trending/attribution),
                                           # social follow + feed, builder, assistant
```

`tests/conftest.py` points the app at a throwaway SQLite DB and media dir via
`DATABASE_URL`/`MEDIA_DIR` env vars, so the suite never touches real data. The
saved-endpoint test confirms the client-may-send-both-contract: a save with both
`project_id` and `unit_id` stores exactly one target (the unit).
