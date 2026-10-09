# PropTech Mobile — Complete Codebase Documentation

> Exhaustive reference for the Expo/React Native app in `mobile/`. Covers every route, screen, layout,
> interaction, data source, state store, component, design token, and known quirk.
> Companion files: [`README.md`](./README.md) (quick start), [`AGENTS.md`](./AGENTS.md) (agent rules),
> [`../FEATURES.md`](../FEATURES.md) (feature log), [`../agent.md`](../agent.md) (phased plan).

---

## 1. Overview

The app is a **single Expo project containing two product layers**:

1. **Marketplace (customer)** — the original PropTech property-discovery product: browse projects,
   3D tours, AR-lite room scans, 360° panoramas, AI assistant, shortlist, enquiries, site-visit
   booking, and an owner "post your property" lead form. Backed by the REST API under `/api/v1`.
2. **EYD homeowner layer ("Build" / "EYD")** — an **offline-first, device-local** home-building
   manager: a 4-step planner, project dashboard, roadmap, budget, payments, site progress,
   professional network, quotations, materials, documents, notifications, an on-device
   intelligence assistant, and a post-handover home passport. State is persisted in AsyncStorage
   (`eyd.state.v1`) with no network dependency.
3. **Builder console** — JWT-authenticated builder tools (portfolio, new project, inventory builder,
   media registry, sales pipeline).

The two customer layers share the same root provider tree, the same Expo Router `Stack`, and the
same 5-tab bar. The EYD layer adds its own **Deep Navy / Electric Blue** design language on top of
the marketplace's **Executive Ember** style.

---

## 2. Tech stack & tooling

| Concern | Choice |
|---|---|
| Runtime | Expo SDK 57.0.15, React Native 0.86.2, React 19.2.3 |
| Routing | `expo-router` ~57 (file-based, typed routes enabled in `app.json`) |
| State / motion | `react-native-reanimated` 4.5.1, `react-native-worklets` 0.10.1 |
| 3D | `expo-gl` + `three` (GLTFLoader) |
| Camera / sensors | `expo-camera`, `expo-sensors` (accel/gyro/magnetometer) |
| Media | `expo-image`, `expo-image-picker`, `expo-file-system` |
| Storage | `@react-native-async-storage/async-storage` |
| Chat UI | `react-native-gifted-chat` (AI assistant) |
| Browser | `expo-web-browser` |
| Icons | `@expo/vector-icons` (Ionicons) + `expo-symbols` |
| Language | TypeScript strict, path alias `@/` → `src/` |
| Lint | `expo lint` (eslint, react-hooks rules) |

Entry point: `expo-router/entry`. App scheme: `proptech`.

---

## 3. Getting started

```bash
npm install
cp .env.example .env
npx expo start --web      # or `npx expo start` for devices
```

### Environment

`.env`:

| Key | Example | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:8000` | Baked in at bundle time. Android emulator: `http://10.0.2.2:8000`. Device: LAN IP / ngrok HTTPS. USB device: `adb reverse tcp:8000 tcp:8000`. |

The EYD layer works fully offline and does not require the backend. The marketplace and builder
console require the backend (see `../backend/README.md`).

---

## 4. Project structure

```
mobile/
├── app.json                     Expo config (typedRoutes, scheme, plugins)
├── src/
│   ├── app/                     expo-router routes (see §5)
│   │   ├── _layout.tsx          root providers + global Stack
│   │   ├── (tabs)/              index, plan, project, network, account
│   │   ├── project/[id]/        index, units, tour, room-scan, room-walkthrough, panorama, assistant
│   │   ├── builder/             login, index, new, [id]
│   │   ├── build/               EYD: index, roadmap, budget, payments, progress, network/, quotations/,
│   │   │                        materials, documents, notifications, intelligence, passport
│   │   ├── saved.tsx, scans.tsx
│   │   └── enquiry.tsx, book-visit.tsx, post-property.tsx
│   ├── components/
│   │   ├── eyd/                 ui.tsx, screen.tsx, sheet.tsx, alert-row.tsx
│   │   ├── app-tabs.tsx / .web.tsx
│   │   ├── motion.tsx           PressableScale, Entrance, Skeleton
│   │   ├── project-card.tsx, primary-button.tsx, secondary-button.tsx, text-field.tsx
│   │   ├── contact-form.tsx, login-prompt.tsx, emi-calculator.tsx, image-gallery.tsx
│   │   ├── CoverageHUD.tsx, ScanTimer.tsx, MotionIndicator.tsx
│   │   ├── error-boundary.tsx, shimmer.tsx, external-link.tsx, animated-icon.tsx / .web.tsx
│   │   ├── themed-text.tsx, themed-view.tsx
│   │   └── ui/                  collapsible.tsx
│   ├── constants/               theme.ts (Executive Ember), eyd.ts (Deep Navy)
│   ├── hooks/                   use-saved.ts, use-theme.ts, use-color-scheme.ts, use-eyd-theme.ts
│   ├── lib/
│   │   ├── eyd/                 store.tsx, types.ts, seed.ts, selectors.ts, meta.ts, format.ts,
│   │   │                        intelligence.ts, materials-repo.ts
│   │   ├── config.ts, http.ts, network.tsx, session.tsx, builder-auth.tsx, follow.tsx
│   │   ├── analytics.ts, emi.ts, format.ts
│   │   └── ar-session.ts, coverage-grid.ts, keyframe-selector.ts, scan-storage.ts, motion-quality.ts
│   ├── services/                api.ts, builder.ts, room-scans.ts
│   └── types/api.ts             TS mirrors of backend schemas
└── assets/                      fonts (DM Sans ×4, Playfair ×2), images
```

---

## 5. Navigation

### 5.1 Root layout — `src/app/_layout.tsx`

- Module-scope side effect: `SplashScreen.preventAutoHideAsync()`.
- Fonts (`useFonts`, 6 faces): `DM Sans`, `DM Sans-Medium`, `DM Sans-SemiBold`, `DM Sans-Bold`,
  `Playfair Display`, `Playfair Display-SemiBold`. **The root returns `null` (blank frame) until all
  fonts load.**
- `Stack screenOptions={{ headerShown: false }}` — global default: no headers.

**Provider tree (outermost → innermost):**

```
SafeAreaProvider
 └ SessionProvider        (lib/session.tsx)      — customer identity
    └ BuilderAuthProvider (lib/builder-auth.tsx) — builder JWT
       └ OfflineProvider  (lib/network.tsx)      — GET /health polling
          └ EyDProvider   (lib/eyd/store.tsx)    — homeowner state (eyd.state.v1)
             └ FollowProvider (lib/follow.tsx)   — builder follow + feed
                └ ThemeProvider (Dark/DefaultTheme)
                   └ ErrorBoundary
                      └ AnimatedSplashOverlay → StatusBar → Stack
```

**Every `Stack.Screen` registration (source order):**

| # | `name` | `options` |
|---|---|---|
| 1 | `(tabs)` | (none) |
| 2 | `saved` | `title: 'Saved'` |
| 3 | `scans` | `title: 'Room scans'` |
| 4 | `project/[id]/index` | (none) |
| 5 | `project/[id]/units` | (none) |
| 6 | `project/[id]/tour` | (none) |
| 7 | `project/[id]/room-scan` | `headerShown: false, presentation: 'fullScreenModal'` |
| 8 | `project/[id]/room-walkthrough` | (none) |
| 9 | `project/[id]/panorama` | (none) |
| 10 | `project/[id]/assistant` | (none) |
| 11 | `builder/login` | `headerShown: true, title: 'Builder sign in'` |
| 12 | `builder/new` | `headerShown: true, title: 'New project'` |
| 13 | `enquiry` | `presentation: 'modal', headerShown: true, title: 'Enquire'` |
| 14 | `book-visit` | `presentation: 'modal', headerShown: true, title: 'Book site visit'` |
| 15 | `post-property` | `presentation: 'modal', headerShown: true, title: 'Post your property'` |
| 16 | `build/index` | `title: 'My project'` |
| 17 | `build/budget` | `title: 'Budget'` |
| 18 | `build/payments` | `title: 'Payments'` |
| 19 | `build/roadmap` | `title: 'Roadmap'` |
| 20 | `build/progress` | `title: 'Progress'` |
| 21 | `build/notifications` | `title: 'Notifications'` |
| 22 | `build/network/index` | `title: 'Professionals'` |
| 23 | `build/network/[id]` | `title: 'Professional'` |
| 24 | `build/quotations` | `title: 'Quotations'` |
| 25 | `build/quotations/[id]` | `title: 'Quotation'` |
| 26 | `build/materials` | `title: 'Materials'` |
| 27 | `build/documents` | `title: 'Documents'` |
| 28 | `build/intelligence` | `title: 'Intelligence'` |
| 29 | `build/passport` | `title: 'Home passport'` |

> **Nuance:** `builder/index` and `builder/[id]` are **not** explicitly registered, so they inherit
> `headerShown: false` and set only an inline `<Stack.Screen options={{ title }} />`. The `build/*`
> and modal routes set `title` but keep headers hidden from the global default; `builder/login` and
> `builder/new` are the only builder routes with a visible native header.

### 5.2 Tab bar — 5 tabs (native vs web)

Tab file: `(tabs)/_layout.tsx` renders `<AppTabs />`. Children: `index`, `plan`, `project`,
`network`, `account`.

**Native** (`src/components/app-tabs.tsx`): expo-router `<Tabs>` (JS bottom tabs — Expo Go safe),
`headerShown: false`, active tint `colors.primary`, inactive `colors.textSecondary`, bar bg
`colors.backgroundElement`.

**Web** (`src/components/app-tabs.web.tsx`): headless `expo-router/ui`
(`Tabs`/`TabList`/`TabTrigger`/`TabSlot`); absolute bottom glass bar
(`backdropFilter: 'blur(20px) saturate(180%)'`, bg `${theme.backgroundElement}E0`, top hairline,
`boxShadow: '0 -2px 12px rgba(0,0,0,0.04)'`), inner row `maxWidth: MaxContentWidth`, focused icon
pill 40×28/radius 14 with `primarySoft` bg, `cursor: 'pointer'`, `accessibilityLabel={label}`.

| `name` | href (web) | title / label | icon (inactive → active) |
|---|---|---|---|
| `index` | `/` | Home | `home-outline` → `home` |
| `plan` | `/plan` | Plan | `compass-outline` → `compass` |
| `project` | `/project` | Project | `business-outline` → `business` |
| `network` | `/network` | Network | `people-outline` → `people` |
| `account` | `/account` | Profile | `person-outline` → `person` |

> The route file is `(tabs)/account.tsx` but its title/label is **Profile**.
> `(tabs)/project.tsx` re-exports `@/app/build/index` and `(tabs)/network.tsx` re-exports
> `@/app/build/network/index` — so the **Project** and **Network** tabs mount the EYD screens.
> **Saved** and **Scans** are **root stack routes**, not tabs. (The old README's "3 tabs — no Scans"
> note is stale.)

### 5.3 Route graph

```
Tab bar: Home(/) · Plan(/plan) · Project(/project) · Network(/network) · Profile(/account)

Home(/) ─▶ /project/{id} · /post-property · /scans · /saved (guest follow) · tabs
Plan(/plan) ── planner wizard → generate → Project tab
Project(/project) = build/index dashboard ─▶ /build/{roadmap,budget,payments,progress,notifications,
                                             network,quotations,materials,documents,intelligence,passport}
Network(/network) = build/network ─▶ /build/network/{id}
saved ─▶ back · /(tabs)/account · /(tabs) · /project/{id}
scans ─▶ back · /project/{id}/room-scan?name=… · /project/{id}/room-walkthrough?scanId=…
account ─▶ /post-property · /project/{id}
project/[id] ─(gated by LoginPrompt)─▶ /enquiry · /book-visit · /project/{id}/tour
project/[id]/units ─▶ /enquiry · /book-visit (with unitId/unitNumber) · /project/{id}/tour?unit=
enquiry / book-visit / post-property ─▶ back (Done)   [all modals]
builder ─▶ /builder/login → /builder → /builder/new · /builder/{id}
```

---

## 6. Design systems

### 6.1 Executive Ember — `src/constants/theme.ts` (marketplace + builder + shared UI)

Side-effect import `import '@/global.css';` (web CSS vars).

| Token | Light | Dark |
|---|---|---|
| `text` | `#0F172A` | `#F1F5F9` |
| `background` | `#F8FAFC` | `#0B1120` |
| `backgroundElement` | `#FFFFFF` | `#151E31` |
| `backgroundSelected` | `#FFEDD5` | `#3B2A1A` |
| `textSecondary` | `#475569` | `#94A3B8` |
| `border` | `#E2E8F0` | `#253048` |
| `primary` | `#EA580C` | `#FB923C` |
| `primaryDark` | `#C2410C` | `#F97316` |
| `primarySoft` | `#FFF7ED` | `#2A1C10` |
| `accent` | `#1D4ED8` | `#60A5FA` |
| `success` | `#16A34A` | `#4ADE80` |
| `warning` | `#D97706` | `#FBBF24` |
| `danger` | `#DC2626` | `#F87171` |

- `Gradients`: `cta ['#F97316','#EA580C']`, `ember ['#FB923C','#EA580C']`,
  `hero ['rgba(234,88,12,0)','rgba(234,88,12,0.35)','rgba(234,88,12,0)']`.
- `Motion`: `fast 150, base 220, slow 320, stagger 60, pressScale 0.965` (note: `PressableScale`
  hardcodes `0.972`).
- `Spacing`: `half 2, one 4, two 8, three 16, four 24, five 32, six 64`.
- `Radius`: `sm 10, md 14, lg 20, xl 28`. `MaxContentWidth = 800`.
- `BottomTabInset = Platform.select({ ios: 56, android: 84, web: 88 })`.
- `Shadows.card` (web `boxShadow` / iOS shadow / Android `elevation:4`); `Shadows.cardHover` (web).
- `Fonts`: iOS/default `'DM Sans'` + `'Playfair Display'`; web CSS vars `var(--font-display)` etc.
- `StatusColors`: `available #16A34A`, `booked #D97706`, `sold #DC2626`, `draft #D97706`,
  `active #16A34A`, `sold_out #DC2626`.

Theme hook `useTheme()` (`src/hooks/use-theme.ts`) returns `Colors[scheme === 'unspecified' ? 'light' : scheme]`.
Web variant returns `'light'` until hydration (`use-color-scheme.web.ts`) → **web first paint is
light even for dark-mode users**.

### 6.2 Deep Navy / Electric Blue (EYD) — `src/constants/eyd.ts`

Independent design language consumed via `useEyDTheme()` (`src/hooks/use-eyd-theme.ts`, uses RN
`useColorScheme` directly) → `eydTokens('light'|'dark')`.

Light tokens: `bg #F4F6FA`, `surface #FFFFFF`, `surfaceAlt #EDF1F7`, `text/navy #0B1F3A`,
`textSecondary #56688A`, `textMuted #8A97AE`, `border #E1E7F0`, `blue #1B5FE0`, `blueDark #1448B0`,
`blueSoft #E9F0FE`, `warm #B4632A`, `warmSoft #F8EFE7`, `success #12805C`, `successSoft #E4F4EE`,
`warning #B7791F`, `warningSoft #FBF1DE`, `danger #C0392B`, `dangerSoft #FBEAE8`, `onBlue #FFFFFF`.

Dark tokens: `bg #070D18`, `surface #0E1626`, `surfaceAlt #141F33`, `text #E9EEF7`,
`textSecondary #9AA9BF`, `textMuted #6F7F97`, `border #1F2C42`, `blue #5B93FF`, `blueDark #3F7BEE`,
`blueSoft #13253F`, `warm #D08A4E`, `warmSoft #241A11`, `success #3FBF8F`, `successSoft #0F2A22`,
`warning #E0A93C`, `warningSoft #2B2210`, `danger #F0706B`, `dangerSoft #2E1614`, `onBlue #04101F`.

Plus `EyDRadius = { sm 8, md 12, lg 16, pill 999 }`, `EyDSpacing = { xs 4, sm 8, md 12, lg 16, xl 24, xxl 32 }`,
`EyDTone = 'neutral' | 'blue' | 'success' | 'warning' | 'danger' | 'warm'`.

---

## 7. Core infrastructure

### 7.1 HTTP — `src/lib/http.ts` + `src/lib/config.ts`

- `API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'`, `API_TIMEOUT_MS = 15000`.
- `ApiError extends Error` with `status` + `detail`.
- `http.get/post/patch/delete`: `fetch` with `Accept: application/json`; `Content-Type` only when a
  body exists; `Authorization: Bearer <token>` only when a token provider is registered.
- Abort at 15 s → `ApiError(0, 'Request timed out. Check your connection.')`; fetch throw →
  `ApiError(0, 'Network error. Is the server running?')`; non-2xx → `data.detail` (string) → joined
  FastAPI `msg`s → `Request failed (status)`. `204` → `undefined`.
- Query values that are `undefined | null | ''` are omitted.
- `setAuthTokenProvider` / `getAuthToken` module-level plumbing (builders register one).

### 7.2 Offline — `src/lib/network.tsx`

- `OfflineProvider` runs `check()` immediately then every **15 000 ms**: `GET ${API_BASE_URL}/health`
  (GET deliberately — backend 405s HEAD). `isOffline = !res.ok` or fetch throw.
- `useOffline()` → `{ isOffline, retryCount, retry }`. Only **Home** consumes it.
- `withRetry(fn, retries = 2, backoffMs = 1000)` exists but is unused by screens.

### 7.3 Session (customers) — `src/lib/session.tsx`

- AsyncStorage key **`session.user`** (JSON `CustomerUser { id, name, phone, email }`).
- Token-less by design: sign-in is an idempotent `POST /api/v1/users` by phone.
- `SessionProvider`: restores on mount (guarded `JSON.parse`), `signIn(user)` persists,
  `signOut()` clears. `useSession()` throws outside the provider.

### 7.4 Builder auth — `src/lib/builder-auth.tsx`

- AsyncStorage key **`builder.session`** (JSON `BuilderSession { token, user }`).
- Holds a synchronous `sessionRef` mirror so `http` can read the JWT without re-render.
- Registers `setAuthTokenProvider(() => sessionRef.current?.token ?? null)` once on mount.
- `signIn(next)` / `signOut()`. `useBuilderAuth()` throws outside the provider.

### 7.5 Follow / feed — `src/lib/follow.tsx`

- `useFollow()` → `{ following, suggestions, feed, isLoading, refresh, loadSuggestions, toggle, isFollowing }`.
- `refresh()`: no user → clears; else `listFollowing(user.id)` + `getFeed(user.id)`; server-authoritative.
- `loadSuggestions()`: `listBuilderSuggestions(20)` (public — runs for guests too).
- `toggle(builderId)`: optimistic flip, then API, then **always `await refresh()`**; on failure
  refresh again and return presence. Initial load deferred with `setTimeout(..., 0)`.
- Mounted once at root. Throws outside the provider.

### 7.6 Analytics — `src/lib/analytics.ts`

- AsyncStorage key **`analytics.session_id`** — `crypto.randomUUID()` or `s-{ts}-{rand}` fallback.
- `trackEvent({ eventType, projectId, unitId?, refUserId? })` → `POST /api/v1/analytics/events`
  with `{ event_type, project_id, unit_id, session_id, ref_user_id }`; **fire-and-forget** (errors
  swallowed). Only project detail (`view`, `share`), tour (`walkthrough_complete`) and the
  assistant (via `getAnalyticsSessionId`) call it.

### 7.7 Formatting — `src/lib/format.ts`

`PROPERTY_TYPE_LABELS`; `formatPrice` (Cr/L/`en-IN`, `Price on request`); `trimZero`; `formatDate`
(`Oct 2026` or `—`); `formatDateTimeLocal`; `formatCount` (`k`/`M`).

### 7.8 EMI math — `src/lib/emi.ts`

`calculateEMI(principal, annualRate, tenureYears)` → `{ monthlyEmi, totalInterest, totalAmount }`
(standard amortisation; zero/negative guards; zero-rate branch `P/n`). `formatEMIPrice` (Cr/L/en-IN).

---

## 8. Shared components & primitives

| Component | File | Notes |
|---|---|---|
| `PressableScale` | `motion.tsx` | spring scale to **0.972** on press-in; light haptics on native only, `.catch(()=>{})`; role `button`. |
| `Entrance` | `motion.tsx` | `FadeInDown` 480 ms, delay `min(index*70, 420)` ms, `Easing.out(cubic)`. |
| `Skeleton` | `motion.tsx` | ping-pong opacity pulse 900 ms. |
| `PrimaryButton` | `primary-button.tsx` | gradient CTA (`Gradients.cta`), height 52/radius 16, label swaps to `Please wait…` while loading, `disabled = disabled || loading`. |
| `SecondaryButton` | `secondary-button.tsx` | text pill, `primary` on `primarySoft`, 1.5 border, height 52; `compact` min-width 64; no `loading` prop. |
| `TextField` | `text-field.tsx` | `smallBold` label + 48-high radius-12 input; no built-in error. |
| `ThemedText` | `components/themed-text.tsx` | types `default/small/smallBold/title/subtitle/display/eyebrow/link/linkPrimary/code`. |
| `ThemedView` | `components/themed-view.tsx` | `type` selects a theme color. |
| `ShimmerBlock` | `shimmer.tsx` | 1000 ms white-gradient sweep. |
| `ErrorBoundary` | `error-boundary.tsx` | "Something went wrong" + "Try again" retry. |
| `AnimatedSplashOverlay` | `animated-icon.tsx` / `.web.tsx` | native splash hand-off; web returns `null`. |
| `Collapsible` | `ui/collapsible.tsx` | chevron + `FadeIn` 200 ms. |
| `ExternalLink` | `external-link.tsx` | opens `expo-web-browser` on native. |
| `CoverageHUD` | `CoverageHUD.tsx` | room-scan 3×8 segment grid + coverage bar. |
| `ScanTimer` | `ScanTimer.tsx` | countdown + Stop + auto-stop. |
| `MotionIndicator` | `MotionIndicator.tsx` | "Slow down" / "Hold steady" pulsing pill. |

### 8.1 EYD component kit

- **`components/eyd/ui.tsx`** — `EydText` (`variant: display|title|heading|subheading|body|small|eyebrow|metric`,
  `tone: text|secondary|muted|blue|onBlue|success|warning|danger|warm`), `EydCard`
  (`tone` incl. `blueSoft`), `EydButton` (`primary|secondary|ghost|danger`, `size="sm"`, `icon`),
  `EydChip` (`EyDTone`, `selected`), `EydProgress`, `EydSyncPill`, `EydIconBadge`, `EydEmpty`
  (`icon|title|body|actionLabel|onAction`), `EydRow`, `EydSectionTitle` (`title|caption|actionLabel|onAction`),
  `EydFieldLabel`.
- **`components/eyd/screen.tsx`** — `EydScreen` (props `children|header|scroll|underTabs|footer|contentStyle`),
  `EydHeaderBar` (`title`, `right`, `onBack?` — `undefined` hides the chevron), `EydContainer`,
  `EydHero` (dashboard hero banner), `EydLinkRow`.
- **`components/eyd/sheet.tsx`** — `EydSheet` (`visible|title|eyebrow|onClose|children|footer`).
- **`components/eyd/alert-row.tsx`** — `EydAlertRow` navigates to `alert.route` and marks it read.

### 8.2 Marketplace components

- **`ProjectCard`** (`project-card.tsx`): cover image (or shimmer), Popular/Sold-out/type badges,
  price block + share, builder initials + follow pill, save/views social row, possession + `Explore →`.
  Guest save/follow → `router.push('/saved')`. Optimistic save count with a render-phase prop-sync
  trick; heart pulse animation; explicit haptics on save (no platform guard).
- **`contact-form.tsx`**: `validatePhone` (digits 10–12), `validateEmail` (optional regex),
  `FormError`, `SuccessCard`.
- **`login-prompt.tsx`**: guest sign-in bottom sheet; primary `Continue`, `Continue browsing as guest`.
- **`emi-calculator.tsx`**: collapsible; 80 % LTV default, rate 3–20 % (step 0.5), tenure 10/15/20/30.
- **`image-gallery.tsx`**: full-screen paging gallery with dots + counter.

---

## 9. Marketplace (customer) screens

### 9.1 Home — `src/app/(tabs)/index.tsx`

Discovery feed with client-side search, three filter groups, trending rail, builder-follow rail,
personalised feed, and CTAs. Layout top→bottom in a single `FlatList` with a big header:
hero (`PREMIUM PROPERTIES` / `Explore your future home` / subtitle), trending strip (`🔥 Trending now`),
`People to follow` rail, `From builders you follow` feed, search bar
(`Search projects, localities, cities…`), offline banner
(`You appear to be offline. Please check your connection.`), `Own a property?` CTA, `Room scans` CTA,
filters (**Property type** Apartments/Villas/Residences/Waterfront · **City** Mumbai/Bengaluru/Pune/Delhi NCR ·
**Status** Active/Sold out · `Clear all`), result count, then `ProjectCard`s.

- **Data:** `listProjects(filters)` → `GET /api/v1/projects`; `FollowProvider` → `GET /api/v1/social/*`;
  `OfflineProvider` → `GET /health`. Offline cache key `projects.cache.{type}.{city}.{status}`.
- **Derived:** search over name/locality/city; `featured` = non-sold-out sorted by views+saves, top 5.
- **States:** 3 `CardSkeleton`s while loading; empty ("No projects yet" / "No matching projects" +
  `Clear filters`); error box + `Tap to retry` (skipped on cache hit); offline banner.
- **Interactions:** pull-to-refresh (`load(true)` + `refreshFollows()`); chips toggle filters;
  trending/feed/cards → `/project/{id}`; guest save/follow → `/saved`; CTAs → `/post-property`, `/scans`.

### 9.2 Saved — `src/app/saved.tsx`

Shortlist + one-tap phone sign-in entry (guests are routed here by save/follow gates).
Three branches: loading spinner; signed-out sign-in card
(`Save your favourites` / `Sign in to shortlist properties and units.` with Name/Phone/Email +
`Log in` + `Manage account →`); signed-in `FlatList` of rows (`Remove` in danger) with empty state
`Nothing saved yet` + `Explore projects`. `hydrateRows` does N+1 fetches
(`GET /users/{id}/saved` then per-item project/unit). Login validation uses Alerts
(`Name required`, `Phone required`, `Sign-in failed`); phone rule is weak (`trim().length >= 8`).

### 9.3 Scans — `src/app/scans.tsx`

Lists device-local AR scan sessions. Header `Scans` + primary `New scan`; body `Loading scans…`,
error line, empty state (`No scans yet` + `Start new scan`), or cards (keyframes/coverage, footer
`✓ Synced to builder` / `Sync failed · Retry` / `Sync to builder`). Bottom-sheet project picker
(`Scan a property`) loads `listProjects()`; choosing a project pushes
`/project/{id}/room-scan?name=`. Card tap → walkthrough; **long-press deletes with no confirmation**.
Sync → `uploadRoomScan` (`POST /api/v1/room-scans`, multipart, **60 s timeout**), then
`markScanSynced`. Not login-gated.

### 9.4 Account / Profile — `src/app/(tabs)/account.tsx`

`Profile` title; signed-out form or signed-in profile card (avatar initial, name, phone, email,
`Edit profile` / `Sign out`); `My enquiries` card (`GET /api/v1/enquiries/me?phone=`, status pills
New/Contacted/Qualified/Site visit/Booked/Closed); `Own a property?` card → `/post-property`.
Validation is inline `Please enter your name` / `Please enter a valid phone number` (weak 8-char rule).
Sign-out has no confirmation.

### 9.5 Enquiry — `src/app/enquiry.tsx` (modal `Enquire`)

Context line (project · unit), Full name / Phone / Email / Message fields, inline `FormError`,
`Send enquiry`. Success card `Enquiry sent` → `Done`. Validation: name; `validatePhone`; `validateEmail`.
`POST /api/v1/enquiries`. No login gate; no analytics event.

### 9.6 Book site visit — `src/app/book-visit.tsx` (modal `Book site visit`)

Context line, Full name / Phone / Date & time (`YYYY-MM-DD HH:MM`), quick-slot chips
(`Tomorrow · 10 AM`, `Tomorrow · 4 PM`, `In 2 days · 11 AM`), hint, `Confirm booking`.
Success `Visit booked`. `POST /api/v1/site-visits`. Local-time parse serialised as UTC ISO.

### 9.7 Post property — `src/app/post-property.tsx` (modal `Post your property`)

Owner lead form, **login-gated** via `LoginPrompt` (`Log in to post your property`; dismissing exits).
Fields: name/phone/email/type chips (Apartment/Villa/Residence/Waterfront)/BHK/city chips/
locality/expected price/description/photos (≤5, `Add photos`). Submit creates
`POST /api/v1/listing-requests`, then (if photos) `POST /api/v1/listing-requests/{id}/images`
multipart. Success `Property submitted`.

---

## 10. Project detail screens (`project/[id]`)

### 10.1 Details — `index.tsx`

Hub: back/share/gallery/save header; 220-high hero with gallery badge; title + type/locality;
3 spec cards (Starting price / Possession / Status); social proof (saved/views/interest);
description; Amenities chips; `EMICalculator`; actions **Unit availability**, **▶ Start 3D walkthrough**,
**📷 Room scan**, **🌐 360° view**, **💬 Ask AI assistant**, half-width **Enquire** + **Book visit**.
Guest CTAs open `LoginPrompt` and resume the pending action
(`Log in to start the walkthrough` / `Log in to enquire` / `Log in to book a visit`).
Data `GET /projects/{id}` + `/media`; analytics `view` (once) + `share`.

### 10.2 Units — `units.tsx`

Sticky filter block (status All/Available(N); sort Default/Price ↑/Price ↓/BHK; BHK 1+–5+),
tower→floor→unit grid with status dots, selected-unit bottom bar (**3D** / **Enquire** / **Book visit**).
Data `GET /towers`, `/units?min_bhk=`, `/towers/{id}/floors`.

### 10.3 3D Tour — `tour.tsx`

expo-gl + three.js orbit walkthrough. GLB from `GET /projects/{id}/tour` (`model_url`, normalized to
6-unit box) with a procedural built-in room fallback. Drag-to-orbit (yaw 0.008/pitch 0.005 rad/px,
pitch clamp `[0.06, 1.15]`, smoothing `K=0.09`). Viewpoint dots, `← Previous` / `Next area →`,
completion card `✓ Tour complete` + `walkthrough_complete` analytics. Source pill
(`◉ Builder scan loaded` / `◉ Demo GLB loaded` / `Built-in preview`).

### 10.4 Room scan — `room-scan.tsx`

`fullScreenModal`, transparent header. Back camera + IMU pose tracking; 24-segment (8 yaw × 3 pitch)
coverage HUD; completion at ≥ 85 % (auto-stop); 60 s timer; motion guardrails
(`> 1.5 rad/s` → "Slow down", blur → "Hold steady"); keyframe selection
(≥ 10° / ≥ 0.3 m, or ≥ 500 ms & > 0.05 m; max 120) with real photo capture serialized through a
promise queue; saved to `room_scans` + `{document}/scans/{id}/`. Start overlay
(`Room Scan` / `Point your camera…` / `Start Scanning`); completion overlay; save Alert
(`Scan saved` → `View walkthrough` / `OK`).

### 10.5 Room walkthrough — `room-walkthrough.tsx`

Plays a stored scan as stop-by-stop oversized panned photos (overscan 2.2×, pan ×1.4/×1.2),
dots, `← Previous` / `Next →`, stats (Stops / Coverage). Local read only.

### 10.6 Panorama — `panorama.tsx`

Horizontal equirectangular pan (overscan 3×, ×1.4) from the first `capture_360` media; `Reset view`.
Missing state `No 360° capture yet`.

### 10.7 AI Assistant — `assistant.tsx`

`react-native-gifted-chat` grounded chat. Greeting + quick replies
(`Is this good for a family?`, `What's the EMI?`, `Units under ₹1.5 Cr`, `Best balcony view`).
`POST /api/v1/assistant/chat` (`{ messages, project_id, session_id }` → `{ reply }`).
Composer `Ask about price, EMI, family fit…`; footer typing/`Grounded in live listing data · not legal or financial advice`.

### 10.8 Supporting libs

- `lib/ar-session.ts` — sensor-fusion pose (accel/gyro/mag @ 16 ms); gyro fallback when no accel;
  magnetometer heading 0–360°; per-sensor try/catch; `startTracking/stopTracking/resetPose/registerPoseCallback/getPose`.
- `lib/coverage-grid.ts` — 8×3 = 24 segments, 300 ms dwell per cell, complete at ≥ 85 % (≥ 21/24).
- `lib/keyframe-selector.ts` — acceptance rules + max 120 (`DEFAULT_KEYFRAME_CONFIG`).
- `lib/scan-storage.ts` — `room_scans` + filesystem layout; `saveScanSession/loadScanSession/listScanSessions/deleteScanSession/markScanSynced/saveKeyframeImage/generateScanId`.
- `lib/motion-quality.ts` — `angularVelocityThreshold 1.5`, `minSharpnessScore 50`.
- `services/room-scans.ts` — `listRoomScans/uploadRoomScan` (multipart, 60 s).

---

## 11. Builder console

### 11.1 Login — `builder/login.tsx`
Email/password → `POST /auth/login` + `GET /auth/me`; persists `builder.session`; `router.replace('/builder')`.
Strings: `Builder console`, `Manage listings, inventory and leads.`, `Work email`, `Password`, `Sign in`.

### 11.2 Console — `builder/index.tsx`
Auth guard → `/builder/login`. Portfolio list (`GET /builder/projects`) with status pills,
`{city} · {unit_count} units · from ₹X Cr` / `price on request`, `{n} available for sale`.
Empty `No projects yet. Create your first listing below.`; footer `＋ New project` → `/builder/new`.

### 11.3 New project — `builder/new.tsx`
Name/slug (auto-slug)/city/locality/type chips/starting price/description. `POST /projects` as `draft`.
Validation `Project name and city are required.` / `Could not derive a URL slug. Enter one manually.`

### 11.4 Manage project — `builder/[id].tsx`
Full management screen (largest builder file): lead analytics metrics (Views/Saves/Enquiries/Visits/
Explorers), status chips (`PATCH /projects/{id}`), `InventoryBuilder` (towers `POST /towers`, floors
`POST /towers/{id}/floors`, units `POST …/units`), inventory grid (tap cycles
available→booked→sold via `PATCH`), media registry (`POST /projects/{id}/media`), sales pipeline
(`GET /builder/projects/{id}/pipeline`). Sections use `Entrance` staggering.

### 11.5 Services — `src/services/builder.ts`
No `/api/v1` prefix: `builderLogin`, `listBuilderProjects`, `getBuilderPipeline`, `createProject`,
`createTower`, `createFloor`, `createUnit`, `addMediaAsset`, `getAnalyticsSummary`,
`updateProjectStatus`, `updateUnitStatus`.

---

## 12. EYD homeowner module

### 12.1 Provider / store — `src/lib/eyd/store.tsx`

- AsyncStorage key **`eyd.state.v1`**, `STATE_VERSION = 1`.
- `EyDContextValue = { state, ready, update(recipe), reset() }` (`useEyD()`).
- `update(recipe)` runs an immer-like recipe over a draft and bumps `updatedAt`.
- Helpers: `logActivity(draft, text, kind)`, `markAlertRead(draft, alertId)`, `markAllAlertsRead(draft, ids)`.
- `migrateState()` fills any missing arrays from `createSeedState()` (state version deliberately **not**
  bumped when `maintenance`/`warranties` were added), so existing installs gain the new arrays.
- Fully offline; no network calls.

### 12.2 Domain types — `src/lib/eyd/types.ts`

`BuildScope = new_home|renovation|extension`; `HomeType = villa|independent_house|duplex|apartment|plot_house`;
`DesignStyle = modern|traditional|minimal|luxury|other`; `HomeProfile`;
`StageId = plan|design|approval|foundation|structure|roof|electrical|plumbing|interior|complete`;
`StageStatus`; `ProjectStage`; `ProjectHealth`; `EydProject`; `BudgetCategoryId`;
`Expense`; `PaymentStatus` + `Payment`; `ProgressUpdate`; `QuotationStatus` + `Quotation`/`QuotationItem`;
`MaterialCategory`/`MaterialAvailability`/`Material`; `DocumentCategory`/`EydDocument`;
`MaintenanceEntry`; `WarrantyEntry`; `ProfessionalCategory`/`Professional`; `AlertKind`/`EydAlert`/`EydRoute`;
`ActivityItem`; `EydState`.

### 12.3 Seed data — `src/lib/eyd/seed.ts`

`STAGE_ORDER`/`STAGE_LABELS`; `BUDGET_CATEGORIES`/`BUDGET_CATEGORY_LABEL` (Land/Site, Design, Materials,
Labour, Construction, Electrical, Plumbing, Interiors, Other, Contingency); `PROFESSIONAL_CATEGORIES` +
labels; sample `PROFESSIONALS`; `MATERIAL_CATEGORY_LABEL` + sample `MATERIALS`; `SCOPE_LABELS`,
`HOME_TYPE_LABELS`, `DESIGN_STYLE_LABELS`; `QUOTATIONS`; `EYD_DOCUMENTS`; `MAINTENANCE_ENTRIES` (3);
`WARRANTY_ENTRIES` (3); `createStages()`; `createProject()` (`My Dream Home`, budget ₹20,00,000,
20 % → structure); `createSeedState()` (12 expenses, 4 payments, 2 progress updates, 5 activity items).
All sample data is explicitly labelled as sample.

### 12.4 Selectors — `src/lib/eyd/selectors.ts`

`budgetTotals` (spent/remaining/usedPct/categories+sharePct), `paymentTotals` (paid/pending/failed),
`teamMembers`, `overallProgress`, `stageById`, `currentStage`, `timeline` (`On track` / `Needs attention`
/ `Behind schedule` + days remaining), `nextAction` (planner → budget rebalance → stage action),
`recentActivity`, `recentProgressUpdates`, `buildAlerts` (stable ids: plan-missing, budget usage ≥90 %,
category concentration ≥40 %, pending payments, recent progress, schedule risk, upcoming stage).

### 12.5 Meta — `src/lib/eyd/meta.ts`

`DOCUMENT_CATEGORY_META` (icon+label per category), `MATERIAL_AVAILABILITY_META`,
`PAYMENT_STATUS_META`, `QUOTATION_STATUS_META`, `ALERT_KIND_META`, `ACTIVITY_KIND_META` (icons per
kind incl. `team`, `maintenance`).

### 12.6 Formatting — `src/lib/eyd/format.ts`

`formatINR`, `formatINRShort` (Cr/L/K), `formatPercent`, `formatDayMonth`, `formatDayMonthYear`,
`relativeTime`, `uid`, `formatBytes`.

### 12.7 Intelligence — `src/lib/eyd/intelligence.ts`

`answer(question, state)` computes answers purely from store state (offline). Intent handlers:
budget, next, cost-increase, quotation comparison, schedule, overview; `SUGGESTED_QUESTIONS`;
each `IntelligenceAnswer` has text + metrics + optional CTA.

### 12.8 Materials repo — `src/lib/eyd/materials-repo.ts`

`listFilteredCatalog(state, { category?, query? })`, `listProjectMaterials(state)`.

### 12.9 Planner tab — `src/app/(tabs)/plan.tsx`

4-step wizard: (1) What are you building? (scope), (2) Basic requirements (plot, floors, bedrooms,
bathrooms, parking, home type), (3) Budget (estimated, range, contingency), (4) Preferences (style,
notes) + Home profile review. `Continue` / `Back` / `Generate my home plan`; writes `profile` and
regenerates the project. Progress bar; validation per step.

### 12.10 Dashboard (Project tab) — `src/app/build/index.tsx`

`Project dashboard` header (back chevron only when `pathname === '/build'`) + `EydSyncPill`.
Hero card (scope · home type / project name / `%` chip / progress / stage + timeline chip),
Budget + Timeline stat cards, `Next action` card, `Important alerts` (`View all`), `Recent activity`,
`Project sections` hub linking to **Budget → Roadmap → Progress → Professionals → Materials →
Quotations → Payments → Documents → Notifications → Ask EYD → Home planner → Home passport**.

### 12.11 Roadmap — `build/roadmap.tsx`

Stage list `Stage x of 10 · updated …`; per-stage status chip (`STATUS_LABEL`/`STATUS_TONE`),
editor sheet (`Edit stage` → `Make current`, save). `Make current` disabled for the current stage.

### 12.12 Budget — `build/budget.tsx`

Totals + category breakdown chips (tap to filter, `Filter: {label}` chip to clear). Expense list
grouped, delete Alert (`Delete expense?`). Add/edit sheet (`New expense` / `Edit expense`) with
category chips, amount, date, note. Empty `Nothing in this category` / `No expenses yet`.

### 12.13 Payments — `build/payments.tsx`

Status filter chips (All + counts), `Payment history` (`x of y payments`), add/edit sheet
(`New payment`), status chips (`PAYMENT_STATUS_META`), delete Alert. Sorted newest first.

### 12.14 Progress — `build/progress.tsx`

Overall `%` metric + current-stage chip + `EydProgress`; `By stage` bars (tap to add there);
`Recent updates` list; add/edit sheet (`New site update` / `Edit · {stage}`) with note, date,
progress, photo attach (`Attach photo` / `Replace photo` / `Remove`). Delete Alert.

### 12.15 Network — `build/network/index.tsx` + `[id].tsx`

Header `Professionals`; sample-data banner; search; category chips (All + `PROFESSIONAL_CATEGORY_LABEL`).
Cards with `Verified`/`Sample` + category chips, `View profile`, `Contact`, `Add to project`/`Added`.
Contact Alert is explicitly sample ("Sample profile — the live marketplace will let you request
contact details over chat…"). Profile detail has `Pricing (estimated)`, `Skills`, `Services`,
`Recent projects`, `Reviews`, and footer **Request quote** / **Contact** / **Add to project**.
Empty `No professional found` / `Profile not found`.

### 12.16 Quotations — `build/quotations.tsx` + `[id].tsx`

Up to 3 selected for `Comparison` (`cheapest highlighted`); list with `Open` / `Edit` / accept/reject;
add/edit sheet (`New quotation`) with vendor, scope, line items (item/qty/unit/rate), notes.
Detail: `Quotation summary`, `BOQ line items` (`Item · qty · rate → total`), `Notes`, `Accept`/`Reject`.
Alerts: `Delete quotation?`, `Accept quotation?`, `Reject quotation?`, `Pick up to 3`.

### 12.17 Materials — `build/materials.tsx`

`Your project list` (removable `Remove {product}`), search, `Catalogue` (`x of y shown`),
category chips, cards with `MATERIAL_CATEGORY_LABEL` + availability chip, `Add to project` /
`In your list ✓`. Empty `No materials found`.

### 12.18 Documents — `build/documents.tsx`

Grouped by `DOCUMENT_CATEGORY_META` (`Home Plan`, `Estimate`, `BOQ`, `Quotations`, `Agreements`,
`Bills`, `Approvals`, `Other`); list + add/edit sheet (name, category, date, attach
`Replace`/`Remove`), view mode with `Rename`/`Delete`, delete Alert. Empty + `Add document`.
Sample vs local source distinguished (`x records · y added by you`).

### 12.19 Notifications — `build/notifications.tsx`

Unread alerts (`Mark all as read`) via `EydAlertRow`; `Activity` feed
(`Everything that changed in this project, newest first.`); empty `No activity yet`.

### 12.20 Intelligence — `build/intelligence.tsx`

Chat input `Ask about budget, schedule, quotes…`; quick-prompt chips from `SUGGESTED_QUESTIONS`
(+ `How much have I paid so far?` after the first turn); answers computed locally
(`Computed from your data · offline`); "Thinking…" pending card; result metrics + optional CTA.

### 12.21 Home passport — `build/passport.tsx`

`Home details` (planner profile), `Plans & progress` (roadmap + updates), `Materials`, `Your team`,
`Payments summary`, `Documents` (`x records · y added by you`), **Maintenance** (`Add`) and
**Warranties** (`Add`) sections. Sheets: maintenance (`New maintenance entry` / `Edit entry`) and
warranty (`New warranty` / `Edit warranty`) with validation (`Add a title for this entry.` /
`Add the item under warranty.`) and delete Alerts.

---

## 13. Endpoint reference

Base URL `EXPO_PUBLIC_API_URL` (default `http://localhost:8000`); standard timeout 15 s; scan upload 60 s.
Customer endpoints under `/api/v1`; builder endpoints have **no** `/api/v1` prefix.

### Customer — `src/services/api.ts`
| Method | Path |
|---|---|
| GET | `/api/v1/projects` (`property_type, city, status, sort`) |
| GET | `/api/v1/projects/{id}` · `/media` · `/tour` |
| GET | `/api/v1/projects/{id}/towers` · `/towers/{tid}/floors` |
| GET | `/api/v1/projects/{id}/units` (`status, min_bhk, max_price`) · `/units/{unitId}` |
| POST | `/api/v1/users` (`{name, phone, email}`) |
| GET | `/api/v1/enquiries/me?phone=` |
| POST | `/api/v1/enquiries` · `/api/v1/site-visits` |
| POST/GET/DELETE | `/api/v1/saved` · `/api/v1/users/{id}/saved` · `/api/v1/saved/{id}` |
| GET/POST/DELETE | `/api/v1/social/builders` · `/following` · `/follows` · `/feed` |
| POST | `/api/v1/assistant/chat` |
| POST | `/api/v1/listing-requests` · `/api/v1/listing-requests/{id}/images` (multipart) |
| POST | `/api/v1/room-scans` (multipart) |
| POST | `/api/v1/analytics/events` |
| GET | `/health` (15 s poll) |

### Builder — `src/services/builder.ts`
`POST /auth/login`, `GET /auth/me`, `GET /builder/projects`, `GET /builder/projects/{id}/pipeline`,
`POST /projects`, `POST /projects/{id}/towers`, `POST …/towers/{tid}/floors`,
`POST …/floors/{fid}/units`, `POST /projects/{id}/media`, `GET /projects/{id}/analytics/summary`,
`PATCH /projects/{id}`, `PATCH /projects/{id}/units/{unitId}`.

---

## 14. Storage keys & filesystem

| Key / path | Owner | Contents |
|---|---|---|
| `session.user` | `lib/session.tsx` | JSON `CustomerUser` |
| `builder.session` | `lib/builder-auth.tsx` | JSON `BuilderSession { token, user }` |
| `eyd.state.v1` | `lib/eyd/store.tsx` | JSON `EydState` (offline homeowner data) |
| `room_scans` | `lib/scan-storage.ts` | Scan session summaries (with `synced?`) |
| `analytics.session_id` | `lib/analytics.ts` | Anonymous session UUID |
| `projects.cache.{type}.{city}.{status}` | Home screen | Offline project-list cache |
| `{document}/scans/{scanId}/keyframes.json` | `scan-storage.ts` | Full keyframe array |
| `{document}/scans/{scanId}/{frameId}.jpg` | `scan-storage.ts` | Captured keyframe photos |

EYD documents/attachments store local file URIs (`EydDocument.uri`); maintenance/warranties and all
budget/payment/quotation/network/material data live inside `eyd.state.v1`.

---

## 15. Verification

```bash
npx tsc --noEmit     # strict types — must stay clean
npx expo lint        # eslint (react-hooks strict rules) — must stay clean
npx expo export      # production bundle check
```

Dev server + backend smoke check (USB device):

```bash
adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8000 tcp:8000
```

Sanity check for the offline EYD layer: it must work with the backend stopped (no requests, state
from `eyd.state.v1`).

---

## 16. Known quirks & behaviours

1. **Home hero accent bar is invisible** — it uses two fully transparent `Gradients.hero` stops.
2. **`ImageGallery` `.gradient`** sets `backgroundColor: 'transparent'` → no scrim behind controls.
3. **Saved** aliases `useSaved().isLoading` as `sessionLoading` and never consults `useSession().isLoading`
   → brief sign-in-card flash during first restore is possible.
4. **Home list spacing** — `contentContainerStyle.gap: 16` plus 16-px separators ≈ 48 px between cards.
5. **Scan deletion** has no confirmation (long-press deletes immediately).
6. **Post-property** can create a second listing if the image upload fails and the user resubmits
   (no idempotency key).
7. **Phone validation is inconsistent**: `validatePhone` (10–12 digits) on forms vs `length >= 8`
   on Account/Saved.
8. **Book-visit slot** is parsed as local time but stored as UTC ISO.
9. **`EMICalculator`** can initialise `principal = NaN` for a non-numeric `basePrice`.
10. **Web first paint** is always light theme until hydration.
11. **EYD state version** is intentionally not bumped when new arrays are added; `migrateState()` fills them.
12. `builder/new` is reachable via deep link without a session (relies on API 401).
13. EYD alert ids are stable, so read-state survives re-generation; `updatedAt` bumps on every change.
