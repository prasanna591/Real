# PropTech Homes — Implementation Strategy

Monorepo: `mobile/` (Expo SDK 57 / RN 0.86 / React 19 / expo-router), `backend/` (FastAPI + SQLAlchemy 2.0), `dashboard/` (Next.js builder console).

Goal: deliver a **premium, "social" property platform** where guests browse freely and only sign in to act (post, save, tour, enquiry, book-visit), with a real camera/IMU room-scan capture entry point and a full-stack listing-request flow.

> Detailed, up-to-date feature inventory: see **[FEATURES.md](FEATURES.md)**.

---

## Principle

**Fix what is broken before adding what is new.** Remaining feature work sits on top of a healthy, tested core. Every change is verified with the existing tooling (`tsc --noEmit`, `expo lint`/`eslint`, `pytest`) before it is considered done.

---

## Current state (audit)

### Product direction (user decisions)
- **Guest-first**: browsing, project detail, units, tour, panorama, room scan, and AI assistant are all open. Login is gated only around **post-property, save/view-saved, tour, enquiry, book-visit**.
- **Login UX** = inline bottom-sheet `LoginPrompt` with "Continue browsing as guest".
- **Contact scope** = Enquiry + Book visit; **social priority** = Share property.
- **Customer posting** = backend-stored **listing request** (pending lead), with **image upload** (up to 5 photos).

### Backend (`backend/`)
- Full REST API under `/api/v1`: `auth`, `projects` (towers/floors/units/media), `engagement` (users, saved, enquiries + notes, site-visits, listing-requests + images, analytics), `builder`, `assistant` (grounded), `uploads`, `room_scans`.
- **Listing-request flow**: `POST /listing-requests` (idempotent, links `CustomerUser` by phone) + `POST /listing-requests/{id}/images` (multipart → `media/listing-photos`, `/media` served). `images: list[str]` JSON column on `ListingRequest`.
- Models: `Project`/`Tower`/`Floor`/`Unit`, `MediaAsset`, `TourViewpoint`, `CustomerUser`, `SavedItem`, `Enquiry`(+notes), `SiteVisit`, `AnalyticsEvent`, `BuilderUser`, `ListingRequest`, `RoomScan`.
- SQLAlchemy 2.0.40, FastAPI 0.115.12. Alembic present but **not used** — `create_all` + destructive `seed.py`. Local disk media with optional `PUBLIC_BASE_URL`; S3 presign available but not default.

### Mobile (`mobile/`)
- Buyer app: home (search/filters) → project detail → units (sort + filter) → **3D WebGL tour** → **360° panorama** → **AI assistant** → **EMI calculator** → enquiry → book visit → saved → account; room-scan + walkthrough; scans tab; **post-property**; **mobile builder console**.
- **server-token-less customer auth** (`session.tsx`, in-memory + AsyncStorage; `POST /users` idempotent by phone).
- **Social/nav**: Ionicons vector tab icons; `LoginPrompt` gated actions.
- **Post property**: `post-property.tsx` form + `expo-image-picker` photo grid (max 5) → `api.ts` `submitListingRequest` / `submitListingRequestImages`.
- **Scans tab "New scan"**: header/empty/list CTAs → project-picker modal → room-scan.
- **Room scan**: camera + accelerometer + gyroscope + **magnetometer compass**; coverage grid (8×3=24 segs, ≥85% complete); motion guardrails; keyframe capture; local storage; sync to builder.
- **Builder console** (`app/builder/*`): JWT login, portfolio, project detail, create project + towers/floors/units (uses `builder-auth.tsx`).

### Dashboard (`dashboard/`)
- Next.js builder console: overview (charts), login, project create, per-project tabs (analytics, inventory, leads, media, **room scans**).
- Talks to the same FastAPI backend via `requireApi` (Bearer token).

---

## Phase 1 — Fix confirmed bugs — ✅ DONE
1. **`backend/app/main.py` `_check_db_health`** — `SELECT 1` now uses `sqlalchemy.text()` (SQLAlchemy 2.0); `/health` returns 200 `{"status":"ok","database":"ok"}`.
2. **Backend tests** — `pytest` green (base suite + room-scan + media-upload).
3. **Mobile + dashboard** — `tsc --noEmit` + `expo lint` / `eslint` clean.
4. **Sentry lazy-import** — `import sentry_sdk` guarded behind `if settings.sentry_dsn:` so the app runs without the package.
5. **Offline poller** — `lib/network.tsx` switched `HEAD /health` → `GET /health` (200); the permanent "offline" banner is gone.

## Phase 2 — Complete mobile customer flows — ✅ DONE
- Audited all buyer screens; added **units sort** (price ↑/↓, BHK) alongside the status filter.

## Phase 3 — Room-scan full-stack sync — ✅ DONE
- Backend `RoomScan` model + `room_scans` router: `POST /room-scans` (multipart, **idempotent** by `client_scan_id`, local disk under `media/`), `GET /room-scans?project_id=`; `media_dir`/`public_base_url` config + `/media` static mount.
- Mobile: `services/room-scans.ts` (`uploadRoomScan`, `listRoomScans`), `ScanSession.synced` flag, scans tab **"Sync to builder"** action.
- Dashboard: **"Room scans"** tab (`scans-tab.tsx`) on project detail with keyframe/coverage/duration stats + photo grid.

## Phase 4 — Social, guest-first product layer — ✅ DONE
- **Guest-first browsing**; **`LoginPrompt`** bottom sheet (inline login-gate + "continue as guest").
- **Ionicons vector tab icons** (outline/filled) for Home / Saved / Scans / Account.
- **Share property** social action surfaced.

## Phase 5 — Post-property (customer listing request) — ✅ DONE
- Backend: `POST /listing-requests` + `POST /listing-requests/{id}/images`; `images` column + read schema; verified end-to-end live (upload → `/media/...` URLs).
- Mobile: `post-property.tsx` image picker (max 5, preview grid, removable) + upload wiring; `submitListingRequest`/`submitListingRequestImages`.

## Phase 6 — Scans-tab capture entry point — ✅ DONE
- **"New scan"** CTAs (header / empty-state / list header) → project-picker modal (`listProjects()`) → `/project/{id}/room-scan?name=…`.

## Phase 7 — Compass/IMU capture + scan robustness — ✅ DONE
- **Magnetometer compass** fused into `DevicePose.heading` (degrees), shown live in the scan HUD alongside coverage.
- **Three scan bug-fixes**:
  1. Per-sensor `try/catch` on `addListener` — a missing/unavailable magnetometer (or other sensor) no longer crashes the session; clean `false` if neither accel nor gyro is available.
  2. Camera permission requested on mount; `CameraView` rendered only after grant, else "Grant camera access" hint; `handleStart` re-requests and alerts if denied.
  3. Gyroscope now drives pose emission as a fallback when accelerometer is unavailable; `resetPose()` runs **before** `startTracking()` so orientation starts clean.

## Phase 8 — Social follow + timeline feed + N+1 fix — ✅ DONE
- **Backend:** `social.py` router: `GET /builders` (followable builder cards), `POST /follows`, `DELETE /follows`, `GET /users/{user_id}/following`, `GET /feed` (timeline of new projects + unit drops from followed builders, newest first).
- **Mobile:** `FollowProvider` (`lib/follow.tsx`) powers the follow rail on Home; `refresh()` is server-authoritative (returns `BuilderCard[]`) so the rail and feed cannot drift after a toggle.
- **Home feed:** `FeedResponse` displayed on `(tabs)/index.tsx`; personalised timeline alongside project discovery.
- **N+1 media fix:** `ProjectRead.cover_url` added; `projects.py` `_attach_cover_url(db, projects)` resolves every cover in a single batched query. `project-card.tsx` renders `project.cover_url` directly — the old per-card `useMedia` fetch and `src/lib/media.ts` deleted.
- **Dashboard bug fixes:** `projects/new` price validation moved before `setBusy(true)`; `media-tab.tsx` local file upload enabled (missing `<input type="file">` added, pre-existing TS error cleared).
- **Backend hygiene:** `engagement.py` local `request` variable renamed so it no longer shadows the FastAPI `Request` param; `SavedItemCreate` contract (client may send both project_id + unit_id, unit wins) documented in backend README.

## Phase 8 verification
- `backend/`: 92 pytest tests green; `/health`, social follow/unfollow/feed, listing-request + image upload, room-scan upload smoke-tested.
- `mobile/`: `npx tsc --noEmit` clean; follow toggle + feed reload verified on Expo Go device.
- `dashboard/`: `npm run build` clean; `media-tab.tsx` upload path + `projects/new` validation order verified.

## Phase 4/5/6/7 verification
- `mobile/`: `npx tsc --noEmit` clean; `npx eslint` clean on all new/modified files. (The pre-existing app-wide `refresh()`-in-effect warnings were later cleared in the 2026 quality pass — `expo lint` is fully clean.)
- `backend/`: imports, `/health`, listing-request + image upload smoke-tested against the live server; DB re-seeded to apply the new `images` schema.

## Phase 8 — Broader feature inventory (documented) — ✅ DONE
- Audited and documented the full feature set beyond the headline work. See **`FEATURES.md` §§ 10–23**:
  - **Home discovery** — search + property-type/city/status filters, shimmer skeletons, pull-to-refresh.
  - **Units** — sort by price ↑/↓ & BHK + status filter.
  - **3D tour** — WebGL GLB viewer (`expo-gl` + `three`) with viewpoints (API or fallback).
  - **360° panorama** — equirectangular preview from `capture_360` media.
  - **AI assistant** — `react-native-gifted-chat` chat + suggested prompts → grounded `POST /assistant/chat`.
  - **EMI calculator** — expandable, rate + tenure presets, ₹L/₹Cr formatting.
  - **Saved, Account, Enquiry, Book-Visit** flows (login-gated where appropriate).
  - **Mobile builder console** (`app/builder/*`) with its own JWT auth.
  - **Dashboard** — overview charts, builder login, project create, per-project tabs (analytics / inventory / leads / media / room scans).
  - **Backend** — `auth`, `builder` (portfolio/analytics/pipeline), full projects/media/tour CRUD, `uploads` (S3 presign + register).

---

## Remaining backlog (opportunistic)
- **Search / exact-match detection + assistant filters.**
- **Alembic migrations** instead of `create_all`.
- **S3 presign** for production media (default is local disk `/media`).
- Add an **"Explore" tab / richer seed** to de-"bare" the app if desired.

## Completed after Phase 8 (2026 quality pass)
- **Mobile lint baseline cleared** — the 10 pre-existing `expo lint` errors (8× `set-state-in-effect`, `display-name`, unescaped entities) are fixed; `expo lint` is now a viable CI gate. Mobile builder auth token wiring (listed below as "wire builder auth token") is **already done** via `builder-auth.tsx` + `setAuthTokenProvider` in `lib/http.ts` — removed from the backlog.
- **Backend import fix** — removed the dangling `FeedKind` import that broke app startup (92 tests restored to green).
- **Customer "My enquiries" feedback loop** — `GET /api/v1/enquiries/me?phone=` + Account-screen status list with badges.
- **CI workflow** — `.github/workflows/ci.yml` (backend `pytest`, mobile `tsc`+`lint`, dashboard `tsc`+`eslint`+`build`).

---

## Operational notes (from the work sessions)
- Backend must be started detached to survive the shell: `setsid nohup … < /dev/null &`.
- `adb reverse tcp:8000 tcp:8000` makes the backend reachable from the phone at `localhost:8000`; Expo Metro on `:8081`.
- New routes require a regenerated `.expo/types/router.d.ts` (regenerated on dev-server bundle; manual patches are overwritten).
- Demo seed: `python scripts/seed.py` (drop + recreate all tables); builder login `demo@proptech.com` / `demo-builder-123`.

---

## Definition of done
- Backend: `pytest` green; changed routes respond correctly from a running server.
- Mobile: `tsc --noEmit` + `expo lint` clean; flow reachable in the running app.
- Dashboard: typecheck/build clean; pages render against the live API.
- Room-scan: scan captures on-device (camera + compass + coverage), syncs to backend, appears in dashboard.
- Post-property: listing + images upload to backend and appear as a pending lead.