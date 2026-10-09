# PropTech Homes — Features & Updates Log

A living record of every feature and update added to the project so far.

- **Monorepo**: `mobile/` (Expo SDK 57 / RN 0.86 / React 19 / expo-router), `dashboard/` (Next.js builder console), `backend/` (FastAPI + SQLAlchemy 2.0, SQLite by default at `sqlite:///./proptech.db`).
- **Auth reality**: the customer app is **server-token-less** — `lib/session.tsx` stores a `CustomerUser` in memory + AsyncStorage (no JWT/expiry). `POST /users` is idempotent create-or-get by phone.

---

## 1. Social / Guest-first Buyer App

### 1.1 Guest-first browsing
- All read journeys (home / project detail / units / tour / panorama / AI assistant / room scan) work **without login**.
- Login is gated only around: **posting a property, save/view-saved, tour, enquiry, book-visit**.

### 1.2 Inline `LoginPrompt` bottom sheet (`components/login-prompt.tsx`)
- Reusable bottom-sheet modal with name/phone/email fields + validation.
- "Continue browsing as guest" option — never forces sign-in to keep exploring.
- Calls idempotent `POST /users`; persists the returned `CustomerUser` via `useSession()`.

### 1.3 Contact scope
- Contact/engagement = **Enquiry + Book visit** (decision made via Q&A).
- Social priority = **Share property**.

### 1.4 Ionicons bottom navigation (`components/app-tabs.tsx`)
- Replaced PNG template icons with Ionicons **vector icons** loaded via the stable `expo-router` `Tabs` API (outline default, filled selected).
- **Current tab set (EYD navigation consolidation):** Home `home-outline`, Plan `compass-outline`, Project `business-outline` → `/build` dashboard, Network `people-outline` → professional network, Profile `person-outline` (`(tabs)/account.tsx`). Same 5 tabs on native and web (`app-tabs.web.tsx`, expo-router/ui).
- **Saved** and **Scans** are no longer tabs — they are root stack routes (`/saved`, `/scans`) reachable from the heart icons on Home/project cards (Saved also hosts one-tap sign-in) and from the Home **"Room scans"** CTA row. Their screens are unchanged.
- **Expo Go compatibility (2026 fix):** the app originally used `expo-router/unstable-native-tabs` (`NativeTabs.Trigger.VectorIcon`), which requires a dev build and rendered a **blank page in Expo Go**. `app-tabs.tsx` now uses the stable JS `Tabs` — works in Expo Go and standalone.

---

## 2. Customer "Post your property" (listing request)

Customers post a property; it is stored on the backend as a **pending listing request (lead)**.

### Backend (`backend/app/api/routes/engagement.py`)
- **`POST /api/v1/listing-requests`** — creates a pending `ListingRequest`; mirrors the idempotent `POST /users` pattern; if a `CustomerUser` already exists for the phone, it links `user_id`.
- **`POST /api/v1/listing-requests/{id}/images`** — uploads one+ `UploadFile` images to `media/listing-photos`, appends returned URLs to `ListingRequest.images`:
  - `media/listing-photos` dir auto-created; filenames `lr{id}-{uuid}.{ext}`.
  - URL = `{public_base_url}/media/{relative}` when `PUBLIC_BASE_URL` is set, else `/media/{relative}`.
- **Model (v2 schema)**: `images: list[str]` (JSON column) added to `ListingRequest` + `ListingRequestRead`. DB re-seeded (SQLite `create_all` does not alter existing tables).

### Mobile
- **`services/api.ts`**: `submitListingRequest()` (JSON create) + `submitListingRequestImages(id, imageUris)` (multipart `FormData` via `fetch`, math UTF timeout + `ApiError` handling). `ListingRequestResult` includes `images: string[]`.
- **`app/post-property.tsx`**: full listing form (owner name/phone/email, property type, BHK, city, locality, expected price, description) + **photo picker**:
  - `expo-image-picker` `launchImageLibraryAsync`, `mediaTypes: ['images']`, multiple selection, **max 5 photos**.
  - Preview grid with remove ("X") badges + an "Add photo" tile.
  - Submit creates the listing request, then uploads the chosen images.

---

## 3. Scans tab — capture entry point

### "New scan" flow (`app/(tabs)/scans.tsx`)
- **New scan** buttons in the header, the empty-state CTA, and the list header.
- Opens a **project-picker `Modal`** (fetched via `listProjects()`, theme-aware sheet).
- Selecting a project → pushes `/project/{id}/room-scan?name={name}` (name URL-encoded).

### Verify/other scan actions (already present)
- List saved scans with thumbnail + date.
- **Sync to builder** per scan: loads full session, multipart-uploads photos, marks synced, shows "✓ Synced" or an error note.
- Delete scan.

---

## 4. Room scan capture (AR-lite, IMU + camera + compass)

### Coverage grid (`lib/coverage-grid.ts`)
- Room divided into a sphere grid: **8 yaw segments × 3 pitch bands = 24 segments**.
- A segment is "covered" after dwelling ≥300 ms in it; scan completes at **≥85%** coverage (auto-stop).
- Live HUD fills green per covered segment + shows coverage %.

### Motion quality (`lib/motion-quality.ts`)
- Reads angular velocity; flags **too_fast** (>1.5 rad/s) or **blurry** (Laplacian variance < 50) with non-blocking prompts ("Slow down" / "Hold steady").

### AR session (`lib/ar-session.ts`)
- **Camera** (`expo-camera`) + **accelerometer + gyroscope + magnetometer** (`expo-sensors`, ~60 Hz).
- **Compass (new)**: `Magnetometer` listener fuses a device-relative **heading** (degrees 0–360 via `atan2(y,x)`), exposed on `DevicePose.heading` and shown live in the HUD (`CoverageHUD`) alongside coverage.
- **Robustness fixes (2026) — the three scan bugs**:
  1. **Crash fix**: each sensor's `addListener` is wrapped in its own try/catch — a missing/unavailable sensor (e.g., magnetometer on the device) no longer crashes the session. If neither accel nor gyro can start, `startTracking` cleanly returns `false`.
  2. **Camera fix**: the room-scan screen requests camera permission on mount and only renders the `CameraView` once granted (else shows a "Grant camera access" hint). `handleStart` also re-requests permission and alerts if denied.
  3. **Coverage fix**: gyroscope now drives pose emission as a **fallback** when the accelerometer is unavailable, so coverage still progresses; `resetPose()` runs *before* `startTracking()` so orientation starts clean instead of discarding early frames.

### Keyframe capture (`lib/keyframe-selector.ts`)
- Selects keyframes spaced by min pose delta and/or time, gated on motion quality.
- `takePictureAsync` (`quality: 0.7`) photo capture, serialized via a promise queue to avoid overlapping captures; images stamped onto selected keyframes, saved via `scan-storage`.

### Session (`lib/scan-storage.ts`)
- Local save/load/delete of scans (thumbnail, keyframes, coverage %, duration), plus `markScanSynced` flag.

---

## 5. Full-stack room-scan sync

### Backend (`backend/app/api/routes/room_scans.py`, model `RoomScan`)
- `POST /api/v1/room-scans` — multipart keyframe-photo upload + metadata; **idempotent** by `client_scan_id`; photos stored on disk under `media/room-scans/`, served under `/media`.
- `GET /api/v1/room-scans?project_id=` — list scans.
- `settings.media_dir` + `public_base_url` added to config; `/media` StaticFiles mount in `main.py`.

### Dashboard
- New **"Room scans"** tab (`components/tabs/scans-tab.tsx`) on the project detail page — lists synced scans with keyframe/coverage/duration stats and a photo grid (opens full-res in a new tab).

---

## 6. Media upload & static serving

- `POST /api/v1/projects/{project_id}/media/upload` (`projects.py`) — stores files under `media/project-media`, returns `/media/...` (or `public_base_url`-prefixed) URL. `POST /media` + `DELETE /media/{asset_id}` supported.
- `/media` static mount in `main.py` (`StaticFiles(directory=media_dir)`).
- S3 presign flow (`core/uploads.py`) available but the local disk path is used by default.

---

## 7. Engagement backend (users, saved, enquiries, visits, analytics)

From `backend/app/api/routes/engagement.py`:
- **`POST /users`** — idempotent customer create-or-get.
- Saved/shortlist: `POST /saved`, `GET /users/{id}/saved`, `DELETE /saved/{item_id}`.
- Enquiries: `POST /enquiries` (logs notification intent), `GET /enquiries`, `PATCH /enquiries/{id}` (status incl. `BOOKED`).
- Enquiry **notes**: `POST`/`GET /enquiries/{id}/notes`.
- Site visits: `POST`/`GET`/`PATCH /site-visits`.
- Analytics: `POST /analytics/events` (view / save / unsave / enquiry / booking / site-visit / walkthrough / assistant / message) + `GET /projects/{id}/analytics/summary` (property_views, serious_explorers, saves, enquiries, site_visits, assistant_messages) — builder-protected.

---

## 8. AI assistant (grounded)

- `backend/app/ai/` — `agent.py` (LLM), `grounding.py`, `fallback.py`; route `assistant.py` under `/api/v1/assistant`.
- Open for guests; `ASSISTANT_MESSAGE` analytics event fired on use.

---

## 9. Demo seed & auth (`backend/scripts/seed.py`, destructive dev seed)

- Builder credentials: **`demo@proptech.com` / `demo-builder-123`** (dashboard login).
- Demo data: **2 projects** (Aurora Skyline – waterfront/Chennai; Zen Residences – villa/Pune), **3 towers, 13 floors, 39 units, 16 media assets, 6 tour viewpoints**, an engagement dataset (customer + saved items, 6 enquiries across the pipeline, 3 site visits, analytics events), and 1 demo room-scan row.

---

## 10. Home / project discovery (buyer) — `app/(tabs)/index.tsx`

- Project listing with **search (free-text), property-type, city, and status filters** (`listProjects`).
- Rich context: theme-aware **`ProjectCard`** (image, name, locality, starting price, status badge) and skeleton **shimmer** loading states.
- **Pull-to-refresh**, offline banner via `useOffline`, animated entrances (`components/motion.tsx`).
- Project detail (`app/project/[id]/index.tsx`) surfaces units, tour, panorama, assistant, enquiry, book-visit, save.

## 11. Eagle units browsing + sort/filter — `app/project/[id]/units.tsx`

- Unit inventory list per project with status (available/sold/booked) rendering.
- **Sort by price ↑/↓ and BHK**, plus the existing **status filter**, all client-side.

## 12. Interactive 3D tour — `app/project/[id]/tour.tsx`

- **WebGL GLB model viewer** via `expo-gl` + `three` + `GLTFLoader`.
- Loads the tour config from `GET /projects/{id}/tour`; **3 tour viewpoints** per project (or built-in fallback viewpoints if the API/model isn't reachable).
- Navigable/free-look 3D walkthrough of the project unit; logs `WALKTHROUGH`/`WALKTHROUGH_COMPLETE` analytics.

## 13. 360° panorama — `app/project/[id]/panorama.tsx`

- Lightweight **equirectangular 360° preview** (pans horizontally) from `capture_360` media via `listMedia`.

## 14. AI property assistant — `app/project/[id]/assistant.tsx`

- **`react-native-gifted-chat`** chat UI with suggested prompts (family suitability, EMI, units under budget, balcony view).
- Calls `sendAssistantChat` → `POST /api/v1/assistant/chat` (grounded LLM + fallback); tracks `ASSISTANT_MESSAGE`.
- Works guest-first (no login required).

## 15. EMI calculator — `components/emi-calculator.tsx` + `lib/emi.ts`

- Expandable inline calculator on unit/project pages — principal (defaulted to ~80% of price), **rate slider, tenure presets (10/15/20/30 yr)**.
- Computes monthly EMI, total interest, total payable via `calculateEMI`; formats in ₹L/₹Cr.

## 16. Saved / shortlist — `hooks/use-saved.ts` + `app/saved.tsx`

- Per-user save/unsave (project or unit) via `POST/DELETE /saved` + `GET /users/{id}/saved`; login-gated. `SavedItem` listed on the **Saved** screen (root route `/saved` — reached from the heart icons on Home/project cards; also hosts one-tap phone sign-in).

## 17. Profile — profile/sign-in — `app/(tabs)/account.tsx`

- Guest profile screen (tab label **Profile**); in-place **name/phone/email sign-in** (idempotent `POST /users`), persisted via `session.tsx`; shows saved count / actions and **sign out**.

## 18. Mobile builder console — `app/builder/*`

- Parallel to the dashboard: **`builder/login.tsx`** (JWT auth), `builder/index.tsx` (portfolio list via `listBuilderProjects`), `builder/[id].tsx` (project detail), `builder/new.tsx` (create project + towers/floors/units).
- Uses `lib/builder-auth.tsx` + `services/builder.ts`.

## 19. Enquiry & Book visit — `app/enquiry.tsx` + `app/book-visit.tsx`

- Contact forms (name/phone/email + message/scheduled date, prefilled from session) → `POST /enquiries` and `POST /site-visits`; login-gated. Reuses `LoginPrompt` when signed out.

## 20. Dashboard (Next.js builder console)

- **`app/page.tsx`** — overview with charts (views, serious explorers, saves, enquiries, visits, assistant messages) via `GET /api/v1/builder/analytics`.
- **`app/projects/new/page.tsx`** — builder project creation (create towers/floors/units too).
- **`app/projects/[id]/page.tsx`** — per-project tabs:
  - `analytics-tab.tsx` — funnel/charts from `GET /projects/{id}/analytics/summary`.
  - `inventory-tab.tsx` — tower/floor/unit CRUD.
  - `leads-tab.tsx` — enquiry pipeline (statuses NEW/REPLIED/CALLED/BACK_OUT/BOOKED + notes).
  - `media-tab.tsx` — media assets + upload.
  - `scans-tab.tsx` — synced room scans (keyframes/coverage/duration + photo grid).
- **`app/login/page.tsx`** — builder JWT auth (`POST /auth/login`), token attached via `requireApi` in `services/api.ts`; 401 → redirect to login.

## 21. Builder & auth backend

- **`auth.py`** — `POST /register`, `POST /login` (returns JWT), `GET /me`.
- **`builder.py`** — `GET /projects` (portfolio), `GET /analytics` (summary), `GET /projects/{id}/pipeline` (leads funnel). All builder-protected.

## 22. Projects/media/tour full CRUD backend — `projects.py`

- Projects, towers, floors (nested under project→tower→floor), units + unit CRUD.
- **Tour config** + **tour viewpoint CRUD**. **Media** CRUD + `POST /{id}/media/upload` (local disk `/media`).
- Public listing (`GET /projects`) + search/filters via query params.

## 23. Uploads (S3 presign, optional) — `uploads.py`

- `POST /uploads/presign` → get presigned URL → `PUT` to S3 → `POST /uploads/register`. Used for production media; default local `media_dir` path does not require it.

## 24. Platform/infra notes (from the work sessions)

- **Backend must be started detached** to survive the shell: `setsid nohup … < /dev/null &`.
- **`adb reverse tcp:8000 tcp:8000`** makes the backend reachable from the phone at `localhost:8000`.
- `mobile/` requires regenerated `.expo/types/router.d.ts` for new routes (regenerated on dev-server bundle; manual patches are overwritten).
- **Offline poller fix** (`lib/network.tsx`): uses `GET /health` (200) instead of `HEAD /health` (backend returns 405 for HEAD), which previously made the app permanently show "offline".
- **Sentry fix** (`backend/app/main.py`): `import sentry_sdk` is guarded behind `if settings.sentry_dsn:` (defaults empty), so the app runs without `sentry_sdk` installed.
- Seed: `python scripts/seed.py` (drop + recreate all tables).

---

## 25. Social feedback loop — builder follow + timeline feed

### Backend (`backend/app/api/routes/social.py`, models `BuilderFollow`, feeds)
- **`GET /api/v1/builders`** — followable builder suggestions → `BuilderCard[]` (profile, project/tower counts, follower counts).
- **`POST /api/v1/follows`** / **`DELETE /api/v1/follows`** — follow/unfollow (201 / 204); `FollowCreate` = `userId` + `builderId`; DELETE is safe when nothing follows.
- **`GET /api/v1/users/{user_id}/following`** — builders a user follows → `BuilderCard[]`.
- **`GET /api/v1/feed`** — timeline of new/updated projects + unit drops from followed builders, newest first, with share-ready metadata (`FeedResponse`/`FeedItem`). Filters by the caller's `user_id`/session.

### Mobile
- **`lib/follow.tsx`** (`FollowProvider`) — follow rail on Home + followed state across the app.
- **Race fix (2026):** `refresh()` now returns the **server-authoritative `BuilderCard[]`**, and the toggle handler seeds its re-fetch result from that returned list instead of a stale captured closure — the rail and feed can no longer drift after a toggle.
- **Home feed** (`(tabs)/index.tsx`) — personalised timeline merged with project discovery; `FeedResponse` mirrors the API.

## 26. Home-feed N+1 fix (cover_url batching)

- **Backend:** `ProjectRead` gained `cover_url: Optional[str]`; `projects.py` `_attach_cover_url(db, projects)` resolves every project's cover in **one batched photo query**, applied in `GET /projects` and `GET /projects/{id}`.
- **Mobile:** `Project.cover_url` added to `types/api.ts`; `project-card.tsx` renders `project.cover_url` directly — the old per-card `useMedia(project.id)` fetch (N+1) was removed and `src/lib/media.ts` deleted.

## 27. Dashboard + submission-state fixes (2026 session)

- **Dashboard `projects/new`**: price validation now runs **before** `setBusy(true)` — the earlier code did set the busy flag first, so the "Creating…" state could flash even for a rejected price. Validating first means a bad price never enters the busy state at all.
- **Dashboard `media-tab.tsx`**: re-enabled local file uploads — added the missing `<input type="file">`, conditional "Upload & register" label, a hint that a selected file takes precedence over the hosted URL, and cleared the pre-existing `string`→`MediaType` TS error in the type select.
- **Backend `engagement.py`**: renamed the local `request` variable in `create_listing_request` so it no longer shadows the FastAPI `request: Request` param (rate-limiter on that endpoint reads the real request object).
- **Mobile submit handlers** (`book-visit`, `enquiry`, `post-property`, `account`, `builder/login`, `builder/new`) audited — all wrap busy-state in `try/catch/finally`; no stuck-loading buttons.

---

## Known remaining items (not blocking)

- Optional polish backlog: search/exact-match detection + assistant filters, Alembic migrations instead of `create_all`, S3 presign for production media, add an "Explore"/richer seed to de-"bare" the app.

---

## 28. 2026 quality + feedback-loop pass

- **Lint baseline cleared:** fixed all 10 pre-existing mobile `expo lint` errors (8× `react-hooks/set-state-in-effect` data-fetch patterns, `react/display-name` in `app-tabs.tsx`, `react/no-unescaped-entities` in `error-boundary.tsx`) — `expo lint`, mobile `tsc --noEmit`, dashboard `eslint`/`tsc`, and `next build` are all clean.
- **Backend import fix:** removed the dangling `FeedKind` import in `app/schemas/__init__.py` (referenced a symbol that didn't exist in `app.schemas.social`) — restored the full 92-test suite to green.
- **Customer "My enquiries" feedback loop (`STRATEGY.md` §1):** new public `GET /api/v1/enquiries/me?phone=` (matches the phone used at sign-in, returns the enquiry + linked `project_name` + `status`); the mobile **Account** screen now lists the caller's enquiries with status badges (tap → project). Closes the "enquiry feedback loop" gap — customers can see their action's state machine (new → contacted → booked → closed).
- **CI pipeline (`STRATEGY.md` §3/§4):** added `.github/workflows/ci.yml` running backend `pytest`, mobile `tsc` + `expo lint`, dashboard `tsc` + `eslint` + `next build` on every push/PR to `main`.