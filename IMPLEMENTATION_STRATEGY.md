# PropTech Homes — Implementation Strategy

Monorepo: `mobile/` (Expo SDK 57 / RN 0.86), `backend/` (FastAPI + SQLAlchemy 2.0), `dashboard/` (Next.js builder console).

Goal: finish the core buyer journey (mobile) and builder journey (dashboard) end-to-end, and sync the room-scan feature from local-only to full-stack.

---

## Principle

**Fix what is broken before adding what is new.** Remaining feature work sits on top of a healthy, tested core. Every change is verified with the existing tooling before it is considered done.

---

## Current state (from audit)

### Backend (`backend/`)
- Full REST API under `/api/v1`: `auth`, `projects` (towers/floors/units), `engagement` (users, saved, enquiries, site-visits, analytics events), `builder` (portfolio, analytics, pipeline), `assistant` (LLM+grounded fallback), `uploads` (S3 presign/register).
- Models: `Project`/`Tower`/`Floor`/`Unit`, `MediaAsset` (model_3d, floor_plan, photo, capture_360, ar_pack, interior_set), `TourViewpoint`, `CustomerUser`, `SavedItem`, `Enquiry`(+notes), `SiteVisit`, `AnalyticsEvent`, `BuilderUser`.
- SQLAlchemy 2.0.40. FastAPI 0.115.12. Alembic present but migrations not yet applied (uses `create_all`).

### Mobile (`mobile/`)
- Buyer app: home/project listing → project detail → units → tour → panorama → assistant → enquiry → book visit → saved → account.
- Builder console view: `builder/` login, list, create project (+towers/floors/units).
- Room scan (new): `room-scan.tsx` camera capture + IMU-fused coverage, `room-walkthrough.tsx` photo viewer, `scans` tab. **Fully local** — no backend/dashboard sync yet.

### Dashboard (`dashboard/`)
- Next.js builder console: overview (charts), login, project create, per-project tabs (analytics, inventory, leads, media).
- Talks to the same FastAPI backend.

---

## Phase 1 — Fix confirmed bugs (highest priority) — ✅ DONE

1. **`backend/app/main.py` `_check_db_health`** — uses `db.execute("SELECT 1")` with a raw string. SQLAlchemy 2.0 requires `sqlalchemy.text("SELECT 1")`; the raw string raises and `/health` always returns `database: error`. **Fixed** (verified `/health` → 200 `{"status":"ok","database":"ok"}`).
2. **Backend tests** — `pytest` green: **53 passed** (49 existing + 4 new room-scan).
3. **Mobile checks** — `npx tsc --noEmit` + `npx expo lint` clean; dashboard `tsc` + `eslint` clean too.

## Phase 2 — Complete mobile customer flows — ✅ DONE

- Audited all buyer screens (units, enquiry, book-visit, tour, panorama, assistant) — already validated, prefilled from session, with loading/empty/error/success states.
- **Added units sort** (price ↑/↓, BHK) alongside the existing status filter in `mobile/src/app/project/[id]/units.tsx` (clean under tsc + lint).

## Phase 3 — Room-scan backend sync — 🔄 IN PROGRESS

- **Backend (done):** new `RoomScan` model (`room_scans` table), schemas, and `room_scans` router:
  - `POST /api/v1/room-scans` — multipart upload of keyframe photos + metadata; idempotent by `client_scan_id`; photos stored locally under `media/` and served via `/media` static mount (no S3 required).
  - `GET /api/v1/room-scans?project_id=` — list scans.
  - `settings.media_dir` + `settings.public_base_url` added to config; `/media` StaticFiles mount in `main.py`.
  - 4 tests added (create, idempotent, unknown project 404, list-by-project).
- **Mobile (done):** `RoomScan` types in `types/api.ts`; new `services/room-scans.ts` with multipart `uploadRoomScan` + `listRoomScans`; `getAuthToken` exposed from `lib/http.ts`; `ScanSession.synced` flag + `markScanSynced`; scans tab now shows a **"Sync to builder"** action per scan (loads full session, uploads photos, marks synced, shows ✓ Synced + error note).
- **Dashboard (done):** new **"Room scans"** tab (`components/tabs/scans-tab.tsx`) on the project detail page — lists synced scans with keyframe/coverage/duration stats and a photo grid (opens full-res in a new tab). Registered in `app/projects/[id]/page.tsx`. `RoomScan.created_at` added to the read schema + mobile/dashboard types.

## Phase 4 — Dashboard feature completeness + integration — ⏳ PENDING (not started)

- Verify inventory CRUD, media presign upload flow, lead status changes against the real API.
- Add seeds so the demo has real data.
- Walk buyer + builder journeys end-to-end.

---

## Definition of done

- Backend: `pytest` green; the changed routes respond correctly from a running server.
- Mobile: `tsc --noEmit` + `expo lint` clean; flow reachable in the running app.
- Dashboard: typecheck/build clean; pages render against the live API.
- Room-scan sync: scan uploads to backend and appears in dashboard.
