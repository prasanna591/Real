# PropTech Customer + Builder App

Expo (SDK 57) + React Native 0.86 + TypeScript app for the PropTech platform, built with [expo-router](https://docs.expo.dev/router/introduction/) file-based routing. Includes the customer journey **and** the builder console.

> Backend must be running first — see [`../backend/README.md`](../backend/README.md).

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
| `EXPO_PUBLIC_API_URL` | `http://localhost:8000` | **Android emulator:** `http://10.0.2.2:8000` · real device: LAN IP or ngrok HTTPS URL (baked in at bundle time) |

## Screens & Journey

```
(tabs)                     bottom tab bar (native: NativeTabs, web: fixed bottom glass bar)
├── index            Home — listing with staggered card entrances (GET /projects)
├── saved            Shortlist — saved projects & units, remove action
└── account          Phone sign-in / profile / sign-out

project/[id]/index   Details — hero image, specs, amenities, ♡ save,
                     "Start 3D walkthrough" + "Ask AI assistant" CTAs
project/[id]/tour    3D walkthrough — expo-gl + three.js room, drag-to-orbit,
                     3 viewpoints, completion → walkthrough_complete event
project/[id]/assistant
                     AI Property Assistant — grounded chat (budget, units,
                     EMI, family fit, views) with quick replies; every turn
                     logged as assistant_message analytics
project/[id]/units   Availability grid — status dots, filter, unit action bar
                     with compact 3D button
enquiry              Modal form → POST /enquiries
book-visit           Modal form + quick-slot chips (tomorrow AM/PM, +2d)

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
│   ├── motion.tsx          PressableScale (haptics), Entrance stagger, Skeleton shimmer
│   ├── project-card.tsx    Home listing card
│   ├── primary-button.tsx  Gradient CTA (press-scale + haptics)
│   ├── secondary-button.tsx Outline button (compact variant)
│   ├── text-field.tsx      Labelled input
│   └── ...                 Themed primitives (themed-text/view, tabs)
├── constants/theme.ts      Colors, Gradients, Motion, Spacing, Radius, Shadows
├── hooks/
│   ├── use-saved.ts        Save/unsave state machine (optimistic toggle)
│   └── use-theme.ts
├── lib/
│   ├── config.ts           API base URL from EXPO_PUBLIC_API_URL
│   ├── http.ts             fetch wrapper: timeouts, JSON errors, Bearer token injection
│   ├── session.tsx         Persisted customer identity
│   ├── builder-auth.tsx    Persisted builder JWT + auth header provider
│   ├── analytics.ts        Persistent session id + trackEvent (fire-and-forget)
│   └── format.ts           ₹ price/date formatting
├── services/
│   ├── api.ts              Customer-facing endpoint calls
│   └── builder.ts          Builder console endpoint calls
└── types/api.ts            TS mirrors of backend Pydantic schemas
```

## Verification

```bash
npx tsc --noEmit     # types (strict mode) ✅ clean
npx expo lint        # eslint (react-hooks strict rules) ✅ 0 problems
npx expo export      # production bundle check
```

## Install on a Real Device (APK)

Requires a free [Expo account](https://expo.dev) and EAS CLI (`npm i -g eas-cli`):

```bash
eas login
eas build:configure                          # uses eas.json preview profile
EXPO_PUBLIC_API_URL=https://<your-ngrok>.ngrok-free.app \
  eas build -p android --profile preview     # builds installable APK
```

Download the APK from the build page link onto your phone (allow "install unknown apps") and install. The API URL is compiled into the bundle, so set it before building. For iterating: `eas build --profile development` gives a dev-client you can pair with `npx expo start --dev-client`.

## Roadmap (this app)

1. Compare properties screen & saved-set scoping for the AI assistant (Phase 2 in root README)
2. Real device QA pass of the GL walkthrough across Android GPU vendors
3. Push notifications for enquiry/visit updates
