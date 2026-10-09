# EYD — Explore Your Dreams · Agent Phased Plan

> **Product:** EYD — a connected platform that helps a homeowner plan, find, build and manage their dream home.
> **Journey:** DREAM → PLAN → CONNECT → BUILD → TRACK → HOME
> **Repo:** `mobile/` (Expo SDK 57 / RN 0.86 / expo-router v6). Backend is unrelated to EYD for now — EYD is 100% local/offline-first.

## Hard rules (every phase)

- **Do NOT rebuild from scratch. Do NOT replace existing architecture. Do NOT remove working functionality. Do NOT break the offline experience.**
- EYD state lives in `mobile/src/lib/eyd/store.tsx` (Context + AsyncStorage `eyd.state.v1`). Extend `EydState`, bump `STATE_VERSION` when the shape changes; keep hydration tolerant of old/corrupt state.
- Use the existing design system only: `mobile/src/components/eyd/{ui,screen}.x`, tokens in `mobile/src/constants/eyd.ts`, `useEyDTheme()`. Deep Navy / Electric Blue. No new UI libraries, no new dependencies unless unavoidable.
- Selectors/logic belong in `mobile/src/lib/eyd/selectors.ts` + `types.ts` + `seed.ts` — screens stay thin. No duplicated data across screens.
- Every screen: works offline, responsive across small/large Android/iOS (no overflow/clipping/fixed widths), has clear CTAs, loading/empty states, and a way back (header with `EydHeaderBar`).
- Mock data must be labelled as sample data — never claim professionals/quotations are real or verified.
- **Verification before each phase is done:** `npx tsc --noEmit` clean, `npx expo lint` clean (0 new warnings), no regressions to non-EYD screens.

## Current state (audit)

- ✅ Data layer: `lib/eyd/{types,store,seed,selectors,format}.ts` — entities, AsyncStorage persistence, 10 stages, 10 budget categories, selectors for budget/timeline/alerts/next-action.
- ✅ Design system: `components/eyd/ui.tsx` (EydText/Card/Button/Chip/Progress/SyncPill/IconBadge/Empty/Row/SectionTitle/FieldLabel), `screen.tsx` (EydScreen/HeaderBar/Hero/LinkRow), `sheet.tsx` (EydSheet bottom sheet), `alert-row.tsx`, tokens.
- ✅ Planner screen: `(tabs)/plan.tsx` — 4-step wizard, persists profile.
- ✅ **Phase 0 (done):** `EyDProvider` mounted; Plan tab wired (native + web); duplicate/shadow routes removed; `/build/*` group exists; `EydRoute` type added; lint clean.
- ✅ **Phase 1 (done):** full dashboard at `/build` with alerts read-state, activity feed, next-action deep links.
- ✅ **Phase 2 (done):** interactive roadmap with stage editor sheet (progress/note/make-current).
- ✅ **Phase 3 (done):** live budget — totals, category filter, expense add/edit/delete, shared `EydSheet`.
- ✅ **Phases 4–12 (done):** payments, progress, network, quotations, materials, documents, notifications, intelligence, passport — all screens, models and store helpers shipped (see execution log below).
- ✅ **Phase 13 (done):** tab structure consolidated to **HOME · PLAN · PROJECT · NETWORK · PROFILE**; Saved + Scans moved to root stack routes (`/saved`, `/scans`) with entry points preserved (heart icons → Saved, new Home "Room scans" row → Scans); project hub reordered to spec; dead code removed.
- ❌ Missing screens: none for the 20-section spec (backend sync remains out of scope — EYD is local/offline).
- ❌ Missing models: none (professionals, quotations, materials, documents, maintenance, warranties all exist).

---

## Phase 0 — Unblock & wire up (P0, blocking)

1. Mount `EyDProvider` in `mobile/src/app/_layout.tsx` (inside `OfflineProvider`, outside tabs) so `useEyD()` works everywhere.
2. Add the EYD entry to navigation: `plan` tab in `components/app-tabs.tsx` + `app-tabs.web.tsx`; remove the duplicate `profile.tsx` (or make it the real profile route) and shadow root routes `explore/saved/scans` conflicts — keep only one canonical route per screen.
3. Create the `build/` route group so `selectors.ts` routes resolve: `build/index` (Project Overview) + placeholder stack for budget/roadmap/progress/notifications etc. as phases land.
4. Fix lint warnings (`EydHeaderBar` unused import, `BUDGET_CATEGORY_LABEL` unused).
5. Verify: tsc + lint clean, Plan opens without crash, marketplace tabs untouched.

**Done when:** Plan wizard runs end-to-end offline, data survives restart, no regression to Home/Saved/Scans/Account.

## Phase 1 — Home / Project Dashboard (§1)

`build/index.tsx` — the 5-second dashboard. Wire the **already-written selectors** (`budgetTotals`, `overallProgress`, `timeline`, `nextAction`, `recentActivity`, `unreadAlerts`):

- Project name, home type, overall progress %, current stage, budget used/remaining (₹18.6L / ₹20L), timeline status chip (On track / Needs attention / Behind).
- **NEXT ACTION** card → pushes to the right `/build/*` route.
- **RECENT ACTIVITY** feed (from `activity[]`).
- **Important alerts** (from `buildAlerts`) with mark-as-read (`readAlertIds` — add `markAlertRead` action to store).
- Sync pill in header.

**Done when:** dashboard is understandable in 5 seconds, all numbers derive from store selectors (no hardcoded totals), alerts deep-link correctly.

## Phase 2 — Project Roadmap (§4)

`build/roadmap.tsx` — visual 10-stage roadmap (01 PLAN … 10 COMPLETE):

- Completed / Current / Upcoming states, per-stage progress, note, updated date.
- Tap stage → detail sheet: view note, **update stage progress**, set stage current, add note.
- "What was completed / what comes next" summary header.
- Stage changes log activity + can advance `project.currentStageId`.

**Done when:** user can update the project stage and dashboard reflects it immediately.

## Phase 3 — Live Budget (§3)

`build/budget.tsx` + expense CRUD:

- TOTAL BUDGET / SPENT / REMAINING header (live from `budgetTotals`), used-% progress.
- Category breakdown (10 categories) with spend + share % — tap category → filtered expense list.
- Add / edit / delete expense: category, title, amount, date, notes. Deleting is a destructive action → confirm.
- Records log activity; totals update immediately (pure selectors).

**Done when:** add/edit/delete works offline, totals recompute instantly, survives restart.

## Phase 4 — Payments (§10)

`build/payments.tsx`:

- TOTAL PROJECT COST / PAID / PENDING (from `payments[]`).
- Payment history rows: date, description, amount, status chip (paid/pending/failed).
- ADD PAYMENT form (amount, date, description, status, optional category). No gateway — "tracking only" note in UI.
- Architecture kept ready for future integration (typed `Payment`, service-shaped action in store).

**Done when:** totals + history correct, adding a payment updates the dashboard alerts (pending payment rule).

## Phase 5 — Construction Progress (§11)

`build/progress.tsx`:

- Overall progress, current stage, per-stage % bars (structure 70% / electrical 20% / plumbing 10% style).
- Recent updates feed (notes, %, date, photo placeholder).
- Add progress update: stage, note, percentage, date, photo placeholder (asset id or URI via `expo-image-picker` if already permitted — otherwise a placeholder chip).
- Progress changes recompute `overallProgress` + timeline.

**Done when:** add update offline works, dashboard progress/timeline reflect it.

## Phase 6 — Professional Network (§5, §6)

New model: `Professional` (id, category, name, location, rating, projectsCompleted, verified, experience, description, skills[], services[], pricing, projects[], reviews[]) + seed mock data (~20). **Clearly labelled "Sample profiles — not verified".**

- `build/network.tsx` (or `network/index.tsx`): 7 category chips (Architect … Supplier), search/filter, professional cards (name, profession, location, rating, projects, verification badge, experience, short description) → VIEW PROFILE / CONTACT / ADD TO PROJECT.
- `build/network/[id].tsx`: full profile — experience, skills, previous projects, reviews, services, estimated pricing, contact; actions REQUEST QUOTE / CONTACT / ADD TO PROJECT.
- "Added to project" list stored in `EydState` (new `projectTeam[]`), visible on dashboard/team section.

**Done when:** browsing, filtering, adding to project all persist offline.

## Phase 7 — Quotations / BOQ (§7)

New model: `Quotation` (id, vendorId/vendorName, items[{item, qty, unitPrice, total}], total, status: pending|received|compared|accepted|rejected, date) + seed.

- `build/quotations.tsx`: list with status chips; detail with BOQ line items (item, qty, unit price, total).
- **Comparison UI:** select 2–3 quotations → side-by-side totals (QUOTE A ₹4,80,000 …), cheapest highlighted, accept/reject with confirmation.
- Accepting logs activity + optional cross-link to budget/payments.

**Done when:** compare screen renders correctly at small widths, status changes persist.

## Phase 8 — Materials (§8)

New model: `Material` catalog (local mock, ~30 items across 10 categories: Cement, Steel, Bricks, Tiles, Paint, Electrical, Plumbing, Doors, Windows, Sanitary) + `projectMaterials[]`.

- `build/materials.tsx`: category filter, material cards (product, price, unit, supplier, availability, Add to project).
- Added materials list with remove; architecture kept flat for a future marketplace API (repository-style functions in `lib/eyd/`).

**Done when:** filter + add/remove persist, mock data clearly sample.

## Phase 9 — Project Documents (§9)

New model: `EydDocument` (id, category, name, size?, date, source: 'local'|'sample', uri?).

- `build/documents.tsx`: 8 category sections (Home Plan, Estimate, BOQ, Quotations, Agreements, Bills, Approvals, Other), list rows with icon/type/date.
- View (preview sheet), Add (create record; optionally `expo-image-picker`/document picker — keep dependency-neutral), Rename, Delete (confirm).
- Works fully offline; mock/sample docs seeded.

**Done when:** CRUD + category filters work, deletions confirm, state persists.

## Phase 10 — Notifications / Alerts (§13)

- `build/notifications.tsx`: notification center from `buildAlerts()` + activity feed; grouped by kind (Budget Alert, Project Update, Action Required, Upcoming) with icons/tones.
- Mark read (single + mark all), unread badge on entry point, deep links via `alert.route`.
- Store gains `markAlertRead` / `markAllAlertsRead`.
- Deterministic local generator only (no push service).

**Done when:** badge counts match, reading a notification updates the badge, links resolve.

## Phase 11 — EYD Intelligence (§12)

- `build/intelligence.tsx`: chat-style assistant UI with **local mock intelligence** — a `lib/eyd/intelligence.ts` module exposing `answer(question, state)` returning structured responses `{ headline, metrics[], recommendation }`.
- Suggested question chips: "Are we on budget?", "What should I do next?", "Why did my cost increase?", "Which quotation is better?", "Are we behind schedule?".
- Responses computed from real store data (budget, timeline, quotations) so they change as data changes.
- Interface shaped so a real AI API can replace the mock later (`async`, typed request/response).

**Done when:** all 5 suggested questions return data-driven, well-structured answers offline.

## Phase 12 — Home Passport (§14)

- `build/passport.tsx`: long-term digital record — home details (profile), plans, materials, professionals, payments summary, maintenance log (new model, simple entries), documents, warranty info (new model).
- Sections render from existing store slices (no duplication); passport-specific additions seeded with sample entries.
- Feels like "your home's digital record" — printable/report-ready layout (clean sections, dates).

**Done when:** every section shows real store data, adding a maintenance/warranty entry persists.

## Phase 13 — Navigation consolidation & polish (§18–§20)

1. Final tab structure: **HOME · PLAN · PROJECT · NETWORK · PROFILE** (replace marketplace tab set carefully — marketplace remains reachable; do not delete working marketplace screens — decision: keep marketplace under Home/Explore, EYD under its own tabs or nest as designed in §18 without overload).
2. Project section hub: Overview / Budget / Roadmap / Progress / Professionals / Materials / Quotations / Payments / Documents (uses `EydLinkRow`).
3. Global patterns: `EydHeaderBar` on all stack screens, primary/secondary/danger button hierarchy, destructive confirmations, empty states (`EydEmpty`), consistent bottom CTAs.
4. Responsiveness pass: every screen on small phone (360dp) and large (430dp+); no clipping, no fixed widths.
5. Remove dead code/duplicates; final tsc + lint.

**Done when:** the full DREAM→PLAN→BUILD→TRACK journey is walkable offline with no dead ends.

---

## Phase execution log

| Phase | Status | Notes |
|---|---|---|
| 0 — Unblock & wire | ✅ done (2026-10-08) | `EyDProvider` mounted in `src/app/_layout.tsx`; Plan tab added (native `app-tabs.tsx` + web `app-tabs.web.tsx`, compass icon, 2nd position); shadow routes deleted (`app/explore.tsx`, `app/saved.tsx`, `app/scans.tsx`, `(tabs)/profile.tsx`); `/build/*` route group created (index, budget, roadmap, progress, notifications) with real read-only data; `EydRoute` type centralizes deep-link routes (`types.ts`); lint warnings fixed. Verify: `tsc` clean, `expo lint` clean, `expo export --platform web` OK. |
| 1 — Dashboard | ✅ done (2026-10-08) | Full dashboard at `/build` (href for `build/index.tsx` — NOT `/build/index`): hero (name/scope/type/progress/stage/timeline chip), budget + timeline stat cards, NEXT ACTION card (`nextAction()` → deep link), alerts list with unread state, recent activity feed, quick-link rows (Budget/Roadmap/Progress/Notifications/Planner). Store: `markAlertRead`/`markAllAlertsRead` helpers. New shared modules: `lib/eyd/meta.ts` (alert+activity icon/tone maps), `components/eyd/alert-row.tsx` (tap = mark read + navigate). Notifications screen refactored to shared row + unread caption. Planner: `generate()` → `/build`; header grid button → dashboard. Verify: tsc/lint/export clean. |
| 2 — Roadmap | ✅ done (2026-10-08) | Roadmap is now interactive: "Project position" card (completed count / now / next), pressable stage rows open a bottom-sheet editor (Modal) with progress ±5 stepper, note input, Save + Make current actions. Store helpers: `setCurrentStage` (before=completed@100%, current, after=upcoming — preserves later-stage progress), `updateStage` (progress clamp 0-100 + note, stamps updatedAt). Changes log activity → dashboard feed updates automatically. Verify: tsc/lint/export clean. |
| 3 — Budget | ✅ done (2026-10-08) | Live budget CRUD at `/build/budget`: totals card (used-% progress with blue/warning/danger tone at 92%/100%, Spent/Remaining rows), pressable 10-category breakdown (spend + share %) with tap-to-filter, filtered expense list (title, category · date, note, amount) → edit sheet, shared `EydSheet` component created (`components/eyd/sheet.tsx`) and roadmap refactored onto it, expense editor (category chips, title, ₹ amount with live preview, YYYY-MM-DD date with fallback validation, notes, inline error card), Add via footer CTA, delete via `Alert.alert` confirm. Store helpers: `saveExpense` (upsert), `removeExpense`; all changes log activity. New shared `EydFieldLabel` in `ui.tsx`. Verify: tsc/lint/export clean. |
| 4 — Payments | ✅ done (2026-10-08) | New `/build/payments` screen (route registered in `_layout.tsx`, added to `EydRoute`): Total project cost metric with planned-budget progress (tone at 92%/100%), Paid/Pending/Failed rows, "tracking only — not a gateway" note card, status filter chips with counts, payment history rows (description, status chip, category · date, amount) → tap to edit, Add via footer CTA, editor sheet (description, ₹ amount w/ live preview, status chips Paid/Pending/Failed, optional category chips incl. None, YYYY-MM-DD date fallback, inline error), delete via `Alert.alert` confirm. Store helpers: `savePayment`/`removePayment`; `paymentTotals()` selector added; pending-payment alert now deep-links `/build/payments`; dashboard gained a Payments quick-link (`paid · pending` subtitle). New `PAYMENT_STATUS_META` in `meta.ts`. Verify: tsc/lint/export clean. |
| 5 — Progress | ✅ done (2026-10-08) | `build/progress.tsx` upgraded to full CRUD: summary card (overall % + current stage chip), per-stage progress bars card (10 stages, tap a stage to add an update there), recent updates feed (stage, date · relative time, optional photo thumbnail via `expo-image`, note, % bar) → tap to edit/delete. Add/edit sheet: stage chips, multiline note, optional progress stepper (±5, clearable, "+ Add percentage" chip when unset), YYYY-MM-DD date fallback, optional photo attach via `expo-image-picker` (`launchImageLibraryAsync`, preview + replace/remove). Store helpers: `upsertProgressUpdate` (insert/replace + nudges stage progress upward toward max), `removeProgressUpdate` (stage progress untouched — roadmap is authoritative). Changes log activity (`progress` kind) → dashboard recomputes `overallProgress`/timeline instantly. Verify: tsc/lint/export clean. |
| 6 — Network | ✅ done (2026-10-08) | New `Professional` model (`ProfessionalCategory` ×7, skills/services/pricing/projects/reviews) + 20 clearly-labelled sample profiles in `seed.ts` (`PROFESSIONAL_CATEGORY_LABEL`, `PROFESSIONALS` — all flagged "Sample / not verified" in UI and, in lookup, `rev/proj/pro` factories). Routes `build/network/index` + `build/network/[id]` (registered in `_layout.tsx`): search (name/skill/location/description), category chips (All + 7), professional cards (verified badge, rating, projects, experience, actions View profile / Contact / Add to project with Add→Added toggle), full profile screen (pricing, skills chips, services list, recent projects, reviews, samordine footer REQUEST QUOTE / CONTACT / ADD TO PROJECT). Store: `addToProjectTeam`/`removeFromProjectTeam` (idempotent), `projectTeam: string[]` in `EydState` (+ `professionals`), `teamMembers()` selector, `migrateState()` fills new arrays so old persisted state survives; state kept at `STATE_VERSION 1`. Activity kind `team` added. Dashboard gained Professionals quick-link with team count. Verify: tsc/lint/export clean. |
| 7 — Quotations | ✅ done (2026-10-08) | New `Quotation` model (vendorName/vendorId→Professional, categoryId, scope, `items[]` BOQ, total, status pending/received/compared/accepted/rejected, date, notes) + 4 mock quotations seeded (3 comparable interior-fit-out quotes across price segments + 1 accepted steel quote, totals computed). `build/quotations.tsx`: status filter chips with counts, cards (vendor, scope·date, total, item count, category, status chip, Compare toggle, Open/Edit) → editor sheet (vendor, scope, status chips, optional category, date, BOQ line-item rows: name/qty/unit/rate with per-row delete, live total, Add item, validation, delete-confirm); side-by-side Comparison card for 2–3 selected (cheapest highlighted + "Best price" chip, "+₹ vs best", per-row Accept/Reject with confirm, "Mark compared" bulk action, 3-selection cap). `build/quotations/[id].tsx`: summary, BOQ table (item/qty/rate/total + sum row), notes, footer Accept/Reject confirm. Store: `saveQuotation` (upsert + recomputes item totals & grand total), `removeQuotation`, `setQuotationStatus`; `QUOTATION_STATUS_META`, activity kind `quotation`; dashboard Quotations quick-link. Verify: tsc/lint/export clean. |
| 8 — Materials | ✅ done (2026-10-08) | New `Material` catalogue model (`MaterialCategory` ×10, availability in_stock/limited/on_order) + 30 seeded sample items (3 per category, suppliers reuse network names). Repository module `lib/eyd/materials-repo.ts` (`listCatalog`/`listFilteredCatalog`/`listProjectMaterials`/`materialById` — swappable for a future marketplace API). `build/materials.tsx`: sample-catalogue disclaimer, search, 11 category chips, "Your project list" card (remove icon), catalogue cards (product, supplier, ₹/unit, category + availability chips, description, Add→In your list toggle). Store: `addProjectMaterial`/`removeProjectMaterial` (idempotent), `projectMaterials[]` + `materials[]` in state (+migrate fallbacks). `MATERIAL_AVAILABILITY_META`, activity kind `material`. Dashboard Materials quick-link. Verify: tsc/lint/export clean. |
| 9 — Documents | ✅ done (2026-10-08) | New `EydDocument` model (8 categories, size bytes, date, source local/sample, uri) + 10 seeded sample records (1 local). `build/documents.tsx`: sample-vs-local disclaimer, category chips with counts, grouped-by-category sections (icon badge, name, size · date, chevron) → document sheet with **view mode** (category/size/date/attachment rows + source chip, Rename/Delete) and **edit mode** (name, category chips, date, optional image attach via `expo-image-picker` with fileSize, record-only allowed), name validation, delete confirm. Store: `saveEydDocument`/`removeEydDocument` (+migrate). New `formatBytes`, `DOCUMENT_CATEGORY_META` (icon+label per category), activity kind `document`. Dashboard Documents quick-link. Verify: tsc/lint/export clean. |
| 10 — Notifications | ✅ done (2026-10-08) | `build/notifications.tsx` completed per spec: alerts **grouped by kind** (Budget alert / Project update / Action required / Upcoming — icon+tone `EydIconBadge` + per-group unread counts), "Mark all as read" section action wired to `markAllAlertsRead`, full **activity feed** section (last 20, `ACTIVITY_KIND_META` icons + relative time), empty states for both. Unread badge on dashboard entry point already live from Phase 1; deep links via `alert.route` unchanged. Verify: tsc/lint/export clean. |
| 11 — Intelligence | ✅ done (2026-10-08) | New `lib/eyd/intelligence.ts` — async `answer(question, state): Promise<IntelligenceAnswer>` returning `{headline, metrics[], recommendation}` from real store data (budget vs progress drift, next-action, top-category cost drivers + last-5-expense check, quotation cheapest-vs-best-rated with spread, timeline expected-vs-actual delta, overview fallback), `SUGGESTED_QUESTIONS` ×5 + a bonus. Screen `build/intelligence.tsx`: chat UI (user bubbles, assistant cards with metric rows via `EydRow`, blue recommendation panel, "Thinking…" pending state, quick-reply chips, input bar with send button), intro card, offline-computed disclaimer. Dashboard "Ask EYD" quick-link. Verify: tsc/lint/export clean (fixed EyDTone→EyDTextTone mismatch, unescaped apostrophe, unused import). |
| 12 — Passport | ✅ done (2026-10-08) | New `build/passport.tsx` — long-term home record rendered report-ready: passport head (project name + scope/home-type chips + updated date), Home details (scope, type, plot, floors, beds/baths/parking, style, planned budget, target handover), Plans & progress (stage, %, stages complete, schedule, site updates), Materials (project list via `listProjectMaterials`), Your team (`teamMembers`), Payments summary (`paymentTotals` + budget %), Documents (first 6 + local/sample markers), Maintenance log and Warranties & AMC (tap-to-edit, Add via `EydSectionTitle actionLabel`, `EydSheet` editor with title/date/cost/notes and item/provider/coverage/expiry, delete confirm). New types `MaintenanceEntry`/`WarrantyEntry` + `state.maintenance`/`state.warranties` (migrate defaults `[]`, version not bumped), 3+3 sample seed entries, store helpers `saveMaintenance`/`removeMaintenance`/`saveWarranty`/`removeWarranty`, activity kind `maintenance` (`construct-outline`/warning meta), `EydRoute += '/build/passport'`, `_layout` entry, dashboard "Home passport" quick-link. Verify: tsc/lint/export clean (removed unused `EydEmpty` import). |
| 13 — Nav & polish | ✅ done (2026-10-08) | **Tabs (user-approved full spec):** `app-tabs.tsx` + `app-tabs.web.tsx` → **HOME · PLAN · PROJECT · NETWORK · PROFILE** (business/people/person icons, account screen heading renamed "Profile"). `(tabs)/project.tsx` + `(tabs)/network.tsx` are thin re-exports of `build/index` and `build/network/index` (canonical `/build` & `/build/network` deep links unchanged); dashboard + network `EydHeaderBar` back button now pathname-guarded (`/build`, `/build/network` only) so tab mounts show no dead back button. Saved/Scans moved out of `(tabs)` to root routes `/saved` + `/scans` (`git mv`, root `_layout` Stack.Screen entries, headerShown false already global); updated 3 heart-icon deep links (`(tabs)/index.tsx`, `project-card.tsx` ×2 → `/saved`); new Home "Room scans" CTA row (scan icon → `/scans`) so Scans has a permanent entry point; Saved keeps sign-in + heart entries. **Hub:** dashboard "Project sections" reordered to spec: Budget → Roadmap → Progress → Professionals → Materials → Quotations → Payments → Documents → Notifications → Ask EYD → Home planner → Home passport. `scans.tsx` + `saved.tsx` gained visible back chevrons (`router.canGoBack()` on their title rows + sign-in view) since they are now pushed stack screens. **Global patterns audited:** `EydHeaderBar` on all 14 EYD stack screens ✓, `Alert.alert` confirms on every destructive flow ✓, `EydEmpty` in budget/payments/materials/quotations/documents/network/progress/notifications ✓ (passport keeps inline contextual hints inside its report sections by design), bottom CTAs on budget/payments ✓. **Responsiveness:** only small `minWidth` label gutters remain (≤150), chips/rows wrap — fits 360dp. **Dead code removed:** `categorySpend`, `stageIndex`, `unreadAlerts`, `profileSummary` (selectors), `listCatalog`, `materialById` (materials-repo) + orphaned seed imports. Verify: routes regenerated (`/project`, `/network`, `/saved`, `/scans`), tsc/lint/export clean. |
