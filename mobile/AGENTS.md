# Agent Guide — PropTech Mobile App

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code. This app is Expo SDK 57 / RN 0.86 / expo-router v6.

## Project conventions

- **Tabs:** native uses stable `expo-router` `Tabs` (JS bottom tabs — works in Expo Go). **Do not** switch to `expo-router/unstable-native-tabs` (native tabs need a dev build and rendered a blank page in Expo Go). Web uses `expo-router/ui` (`app-tabs.web.tsx`).
- **Auth:** customers are token-less — `lib/session.tsx` stores the `CustomerUser` (idempotent `POST /users` by phone) in memory + AsyncStorage. Builders use a JWT via `lib/builder-auth.tsx`.
- **Social/follow:** `lib/follow.tsx` (FollowProvider) — `refresh()` returns the server list; `toggle()` re-fetches after flipping so UI never goes stale.
- **Media:** `Project.cover_url` is provided by the backend list/detail responses (batched). Do not add per-card media fetches (the old `useMedia` in `src/lib/media.ts` was deleted).
- **API errors:** `lib/http.ts` throws `ApiError`; screens must `try/catch/finally` around `setBusy` so buttons never get stuck.
- **Offline:** `lib/network.tsx` polls `GET /health` (backend returns 405 for HEAD — do not use HEAD).
- **Room scan:** `lib/ar-session.ts` wraps every sensor `addListener` in try/catch; camera permission requested on mount; gyro drives pose when accelerometer is missing.
- **New routes** require regenerated `.expo/types/router.d.ts` (regenerated automatically on dev-server bundle; manual patches are overwritten).

## Verification

```bash
npx tsc --noEmit    # strict types — must stay clean
npx expo lint       # eslint — must stay clean
npx expo export     # production bundle check
```

Dev server + backend smoke check (USB device):

```bash
adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8000 tcp:8000
```