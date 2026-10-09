# PropTech Customer + Builder App

Expo (SDK 57) + React Native 0.86 + TypeScript app for the PropTech platform, built with [expo-router](https://docs.expo.dev/router/introduction/) file-based routing. Includes the customer journey, the **EYD homeowner layer** (offline build/home manager), **and** the builder console.

> **Full reference:** see [`DOCUMENTATION.md`](./DOCUMENTATION.md) for every route, screen, layout,
> interaction, data source and design token.

> Backend must be running first — see [`../backend/README.md`](../backend/README.md). The EYD
> (Build) layer is **offline-first** and works without the backend.

## Design System ("Executive Ember")

Generated with the [ui-ux-pro-max design engine](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (Glassmorphism style recommendation for high-end corporate), tuned to an orange-complementary business palette:

| Token | Light | Usage |
|---|---|---|
| `primary` | `#EA580C` | CTAs, active tabs, links (4.5:1 on white) |
| `primarySoft` | `#FFF7ED` | Chip/selection backgrounds |
| `background` | `#F8FAFC` / cards `#FFFFFF` | Layered light surfaces |
| `text` | `#0F172A` slate-900 | Executive contrast |
| `Gradients.cta` | `#F97316 → #EA580C` | Primary buttons |

Motion principles (Reanimated 4, UI-thread): press-scale feedback `0.972` + light haptics on native, staggered `FadeInDown` entrances (`Entrance` component, 60–70ms cadence), shimmer skeletons instead of spinners. Reduced-motion friendly (no pulsing CTAs).

Safe area: explicit `SafeAreaProvider` at root; every screen uses `react-native-safe-area-context` `SafeAreaView` with explicit edges so notches/gesture bars are never overlapped.

## Get Started

```bash
npm install
cp .env.example .env
npx expo start --web      # or plain `npx expo start` for devices
```

### Environment

`.env`:

| Key | Example | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:8000` | **Android emulator:** `http://10.0.2.2:8000` · real device: LAN IP or ngrok HTTPS URL (baked in at bundle time). On a USB-connected device, `adb reverse tcp:8000 tcp:8000` lets `http://localhost:8000` reach the host backend directly. |

## Screens & Journey

```
(tabs)                     bottom tab bar — FIVE tabs
                           (native: expo-router Tabs — works in Expo Go;
                            web: expo-router/ui glass bar)
├── index            Home — projects listing + search/filters + pull-to-refresh,
│                    builder follow rail + personalised feed (POST /feed)
├── plan             Plan — EYD 4-step home planner (scope, requirements, budget,
│                    preferences) → "Generate my home plan"
├── project          Project — EYD project dashboard (re-exports app/build/index)
├── network          Network — EYD professionals directory (re-exports app/build/network)
└── account          Profile — phone sign-in / profile / sign-out / my enquiries

saved                Shortlist (ROOT route, not a tab) — saved projects & units
scans                Room scans (ROOT route, not a tab) — saved scans, "New scan" →
                     project picker, "Sync to builder" (multipart keyframes) & delete

project/[id]/index   Details — hero gallery, specs, amenities, ♡ save, EMI calculator,
                     "Start 3D walkthrough" + "Ask AI assistant" CTAs
project/[id]/tour    3D walkthrough — expo-gl + three.js GLB room, drag-to-orbit,
                     3 viewpoints, completion → walkthrough_complete event
project/[id]/room-scan   Camera + IMU (accel/gyro/magnetometer) AR-lite capture:
                      24-segment coverage dome (≥85% → auto-stop), motion guardrails,
                      keyframe capture, stored locally
project/[id]/room-walkthrough   Pose-linked walkthrough playback of a saved scan
project/[id]/panorama  360° equirectangular preview from capture_360 media
project/[id]/assistant   AI Property Assistant — grounded chat (budget, units, EMI,
                     family fit, views) with quick replies
project/[id]/units   Availability grid — status dots, sort (price/BHK) + filter
enquiry              Modal form → POST /enquiries
book-visit           Modal form + quick-slot chips (tomorrow AM/PM, +2d)
post-property        Customer "sell/list my property" → POST /listing-requests
                     (+ up to 5 photos via multipart image upload)

EYD Build layer (offline-first; state in AsyncStorage "eyd.state.v1")
build/index          Project dashboard — hero, budget/timeline, next action, alerts, hub
build/roadmap        Stage roadmap + "Make current"
build/budget         Expenses by category, filter chips, add/edit
build/payments       Payment history + status filters
build/progress       Overall % + per-stage bars + site updates (with photo)
build/network/[id]   Professionals directory + profile (sample data, labelled)
build/quotations     Quotations + comparison (≤3) + accept/reject, [id] detail
build/materials      Material catalogue + your project list
build/documents      Documents grouped by category, add/attach
build/notifications  Alerts (mark all read) + activity feed
build/intelligence   On-device Q&A grounded in your data (offline)
build/passport       Home passport — details, plans, materials, team, payments,
                     maintenance & warranties

builder/login        Builder JWT sign-in (persisted session)
builder/index        Portfolio list — status pills, availability counts
builder/new          Create project (auto-slug, type chips) → DRAFT
builder/[id]         Console: analytics metrics, status toggle, tower/floor/
                     unit builder, media registration, sales pipeline
```

## Architecture

```
src/
├── app/                    expo-router routes (see map above)
├── components/
│   ├── app-tabs.tsx        Bottom tabs (expo-router Tabs + Ionicons; Expo Go safe)
│   ├── app-tabs.web.tsx    Web tabs (expo-router/ui Tabs)
│   ├── motion.tsx          PressableScale (haptics), Entrance stagger, Skeleton shimmer
│   ├── project-card.tsx    Home listing card (image, locality, price, status badge)
│   ├── primary-button.tsx  Gradient CTA (press-scale + haptics)
│   ├── secondary-button.tsx Outline button (compact variant)
│   ├── contact-form.tsx    Shared name/phone/message fields (enquiry, book-visit)
│   ├── login-prompt.tsx    Inline guest login bottom sheet ("continue browsing")
│   ├── emi-calculator.tsx  Expandable EMI widget (rate slider, tenure presets)
│   ├── image-gallery.tsx   Swipeable project media gallery
│   ├── animated-icon.tsx   Animated home/scan icons (native + .web variants)
│   ├── error-boundary.tsx  Screen-level crash boundary
│   ├── CoverageHUD.tsx     Live scan overlay — segment dome + compass + coverage %
│   ├── ScanTimer.tsx / MotionIndicator.tsx   Room-scan chrome
│   ├── text-field.tsx      Labelled input
│   ├── eyd/                EYD kit — ui.tsx, screen.tsx, sheet.tsx, alert-row.tsx
│   └── ui/                 Themed primitives (collapsible, themed-text/view, tabs)
├── constants/
│   ├── theme.ts            Executive Ember: Colors, Gradients, Motion, Spacing, Radius, Shadows
│   └── eyd.ts              Deep Navy / Electric Blue EYD tokens + radii/spacing/tones
├── hooks/
│   ├── use-saved.ts        Save/unsave state machine (optimistic toggle)
│   ├── use-eyd-theme.ts    EYD tokens by color scheme
│   └── use-theme.ts / use-color-scheme.ts
├── lib/
│   ├── eyd/                Offline homeowner layer:
│   │   ├── store.tsx       EyDProvider + useEyD (eyd.state.v1 persistence, update/reset)
│   │   ├── types.ts/seed.ts/selectors.ts/meta.ts/format.ts   domain, seed, derived, labels
│   │   ├── intelligence.ts On-device Q&A grounded in state
│   │   └── materials-repo.ts  Catalogue/project-list selectors
│   ├── config.ts           API base URL from EXPO_PUBLIC_API_URL
│   ├── http.ts             fetch wrapper: timeouts, JSON errors, Bearer token injection
│   ├── session.tsx         Persisted customer identity (passwordless phone sign-in)
│   ├── builder-auth.tsx    Persisted builder JWT + auth header provider
│   ├── follow.tsx          Builder follow state + feed mutations (server-authoritative)
│   ├── network.tsx         useOffline() via GET /health polling
│   ├── analytics.ts        Persistent session id + trackEvent (fire-and-forget)
│   ├── emi.ts / format.ts  EMI math, ₹ price/date formatting
│   ├── ar-session.ts       Camera + IMU session (per-sensor try/catch, compass heading)
│   ├── coverage-grid.ts    8 yaw × 3 pitch segment coverage grid (24 segs, ≥85% done)
│   ├── motion-quality.ts   Slow/blurry frame guardrails
│   └── keyframe-selector.ts / scan-storage.ts   Keyframe & local scan persistence
├── services/
│   ├── api.ts              Customer-facing endpoint calls (incl. follow/feed, listing)
│   ├── builder.ts          Builder console endpoint calls
│   └── room-scans.ts       Room-scan multipart upload + listing
└── types/api.ts            TS mirrors of backend Pydantic schemas
```

## Verification

```bash
npx tsc --noEmit     # types (strict mode) ✅ clean
npx expo lint        # eslint (react-hooks strict rules) ✅ 0 problems
npx expo export      # production bundle check (checks all platforms)
```

## Run on a Real Device (USB, Expo Go)

Requirements: Expo Go installed on the phone, adb from the Android SDK.

```bash
# 1. Start backend (see ../backend/README.md) — keep it running on :8000
# 2. Start Metro
npx expo start

# 3. Forward ports so the phone reaches Metro (:8081) and the API (:8000)
#    via localhost (do this again after any USB reconnect):
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8000 tcp:8000

# 4. Open the app from Expo Go (the "exp://" QR or the listed project)
```

The bundled `EXPO_PUBLIC_API_URL=http://localhost:8000` then resolves through
the reverse tunnel. For real-network testing, set the env var to the machine's
LAN IP and rebuild the bundle.

## Install a Standalone APK

Requires a free [Expo account](https://expo.dev) and EAS CLI (`npm i -g eas-cli`):

```bash
eas login
eas build:configure                          # uses eas.json preview profile
EXPO_PUBLIC_API_URL=https://<your-ngrok>.ngrok-free.app \
  eas build -p android --profile preview     # builds installable APK
```

Download the APK from the build page link onto your phone (allow "install unknown apps") and install. The API URL is compiled into the bundle, so set it before building. For iterating: `eas build --profile development` gives a dev-client you can pair with `npx expo start --dev-client`.

## Performance & Data Notes

- **Home feed is batched**: the list endpoint returns `cover_url` per project (one photo query for the whole page) — cards never issue per-item media requests (removed the old N+1 `useMedia` fetch).
- **Social follow state is server-authoritative**: `lib/follow.tsx` re-fetches the builder list after every toggle, so the feed and follow rail can't drift.
- **Room scans stay on-device** until the user taps "Sync to builder" (multipart upload to `POST /room-scans`).
- **EYD layer is fully offline**: all homeowner data lives in AsyncStorage (`eyd.state.v1`); the
  intelligence assistant answers from local state, and materials/professional data is sample data
  clearly labelled in the UI. Only `room_scans`, the EYD store, and customer/builder sessions use keys
  listed in [`DOCUMENTATION.md` §14](./DOCUMENTATION.md#14-storage-keys--filesystem).

## Roadmap (this app)

1. Compare properties screen & saved-set scoping for the AI assistant (Phase 2 in root README)
2. Real device QA pass of the GL walkthrough across Android GPU vendors
3. Push notifications for enquiry/visit updates