# PropTech Platform — Digital Property Experience & Conversion

A digital property experience and conversion platform. Real estate projects become interactive digital experiences where customers can explore, customize, compare and shortlist properties remotely, while developers gain a measurable digital sales channel.

**Concept shorthand:** Google Maps + Airbnb + 3D showroom + property sales assistant, mobile-first.

**Monorepo layout:**

| Directory | Stack | Purpose |
|---|---|---|
| [`backend/`](./backend/README.md) | FastAPI · SQLAlchemy · SQLite→PostgreSQL | PropTech API (`/api/v1`), builder JWT auth, analytics |
| [`mobile/`](./mobile/README.md) | Expo SDK 57 · React Native 0.86 · expo-router | Customer app — discovery → details → units → save → enquire → book visit |

---

## Implementation Status

### ✅ Working now

**Customer journey end-to-end** (mobile app ↔ live API):

```
Home listing → Property details → Unit availability → Save ♡ → Enquire → Book site visit
```

| Feature | Backend | Mobile |
|---|---|---|
| Project catalog (filter by type/city/status) | ✅ | ✅ Home listing |
| Tower → floor → unit hierarchy | ✅ | ✅ Unit availability grid |
| Unit status (available/booked/sold) + filters | ✅ | ✅ status dots + filter |
| Media assets (3D/floor plan/photo/360°/AR) | ✅ URL registry | ✅ hero image |
| Passwordless phone sign-in | ✅ | ✅ Account tab |
| Save/shortlist projects & units | ✅ | ✅ Saved tab |
| Enquiries → builder lead pipeline | ✅ | ✅ Enquiry form |
| Site visit booking | ✅ | ✅ Book visit form |
| Analytics events (view/save/unsave/enquiry/visit) | ✅ | ✅ auto-tracked |
| Builder dashboard metrics summary | ✅ (JWT-protected) | n/a |
| Builder JWT auth (bcrypt) on all write endpoints | ✅ | n/a |

### 🚧 In progress / rough edges

- **Media**: registered by URL string only — no file upload yet; seed data has placeholder URLs
- **Book visit**: date/time is manual text input (`YYYY-MM-DD HH:MM`); date picker pending
- **Customer identity**: phone-only, no OTP verification
- **Analytics**: only `view` events fire from mobile; `walkthrough_complete` needs the 3D flow

### 📋 Not started (roadmap)

1. **3D experience/walkthrough** — the core differentiator (see §2.2 of the product spec below)
2. **Builder dashboard web app** — backend endpoints ready, no frontend yet
3. **S3 file uploads** (presigned PUT)
4. **Alembic migrations + PostgreSQL switch**
5. **Hardening**: real `JWT_SECRET_KEY`, CORS origins lockdown, rate limiting, pytest suite
6. **App branding**: icon/splash still template assets

---

## Quick Start

```bash
# 1. Backend (terminal 1)
cd backend
source .venv/bin/activate            # or create: python3 -m venv .venv
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload        # → http://localhost:8000/docs
python scripts/seed.py               # demo data (Aurora Skyline project)
python scripts/create_builder.py "Acme Builders" builder@acme.com secret123
```

```bash
# 2. Mobile app (terminal 2)
cd mobile
npm install
cp .env.example .env                 # set EXPO_PUBLIC_API_URL
npx expo start                       # press i / a, or scan QR in Expo Go
```

> Android emulator must use `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000`.
> iOS simulator and web can use `http://localhost:8000`.

Full API reference: interactive docs at `http://localhost:8000/docs`, or [`backend/README.md`](./backend/README.md).

---
---

# Product Vision & Development Guidelines

## Positioning

Not "an app where you can view houses in 3D" (easy to copy).

**Positioning statement:**

> A digital property experience and conversion platform. We turn real estate projects into interactive digital experiences where customers can explore, customize, compare and shortlist properties remotely, while developers gain a measurable digital sales channel.

**Long-term moat:** 3D property data + customer behavior data + configuration data + AR + AI + sales analytics — not the 3D viewer itself.

## 1. Customer Journey

Discover → Experience → Customize → Compare → Shortlist → Visit → Book

## 2. Customer App — Screens & Features

### 2.1 Home Screen ✅ shipped (listing form)
- Theme: "Explore your future home" (not a plain listing feed)
- Property category cards: Luxury Apartments, Villas, Premium Residences, Waterfront Properties
- Each card shows: starting price, location, configuration, possession date, 3D preview thumbnail, "Explore" CTA

### 2.2 The Experience Screen (core/centerpiece feature) — not started
- Cinematic walkthrough sequence: Exterior → Entrance → Living Room → Bedroom → Kitchen → Balcony → Amenities
- Gestures: swipe to look around, pinch to zoom, tap to interact, drag to rotate, scroll to transition between spaces, tap hotspots for info, double-tap to enter a room
- Rendering approach: Three.js / React Three Fiber concepts adapted for mobile-compatible rendering (via React Native + a WebGL/3D bridge, or a native 3D engine)

### 2.3 Interactive Rooms — not started
- Tap a room element to reveal detail layers, e.g. in Living Room:
  - Dimensions (e.g. 18' x 14')
  - Furniture options (sofa, dining table, TV unit)
  - Interior tier (Standard / Premium / Luxury)
- Selecting an option visually updates the room in real time — more engaging than a static 360 photo

### 2.4 "Customize My Home" — deferred per MVP scope
- User picks: flooring (Marble/Wooden/Tile), wall color (White/Beige/Grey), kitchen tier (Standard/Premium), furniture style (Minimal/Modern/Luxury)
- Visual updates render live as choices are made
- Shows estimated property value based on selected configuration
- "Save configuration" persists the choice to the user's profile

### 2.5 AR Mode — deferred per MVP scope
- User points phone camera at a real (possibly unfinished) room
- App places 3D assets into the live camera view: sofa, bed, dining table, TV, kitchen, lighting, interior styling
- Marketing tagline potential: "See your future home"
- Strong selling point for builders during site visits

### 2.6 Property Intelligence Panel — partially shipped (specs + amenities on details screen)
- Core specs: configuration (e.g. 3BHK), area (sq.ft), price
- Location data: distance to school, hospital, airport, metro (via Maps API)
- Amenities list with icons: pool, gym, park, clubhouse, parking

### 2.7 Unit Selection ✅ shipped (grid picker)
- Tower/floor/unit picker showing live status: SOLD / AVAILABLE / BOOKED per unit (e.g. A101, A102...)
- Tapping an available unit updates the 3D experience to reflect that exact apartment (facing, floor, layout) ← 3D part pending
- Shows unit-specific details: BHK, area, facing direction, price
- "Explore this home" CTA launches the tailored 3D experience ← pending

### 2.8 Compare Properties — deferred
- User saves multiple properties to a comparison list
- Side-by-side table: price, area, bedrooms, distance/location, amenity count, possession date
- Optional: app-generated explanation of which property fits the user's stated needs better

### 2.9 AI Property Assistant — deferred
- Chat-style Q&A scoped to a specific property or the user's saved set, backed by an LLM + the property database
- Example queries the assistant should handle:
  - "Is this good for a family with two children?"
  - "What's the EMI for this apartment?"
  - "Which unit has the best balcony view?"
  - "Show me apartments under a given budget"
- Answers should be grounded in actual listing data (specs, nearby amenities, pricing), not generic responses

### 2.10 Save, Shortlist, Enquire, Book Visit ✅ shipped
- Save/heart a property or unit
- Submit an enquiry (routes to builder's sales team as a lead)
- Book a physical site visit slot directly from the app

## 3. Builder Dashboard — Screens & Features (API ready, frontend not started)

### 3.1 Project Management
- Create/manage Projects → Towers → Floors → Units
- Set pricing per unit/configuration
- Upload floor plans, 3D models, interior asset sets, amenities data, and promotional offers

### 3.2 Asset Management
- Upload/manage 3D models, 360 captures, AR asset packs, interior configuration options per project

### 3.3 Enquiry / Lead Management
- View incoming enquiries and site-visit bookings
- Basic lead status tracking for the builder's sales team

### 3.4 Live Analytics (key value driver for builders)
- Property views (total)
- "Serious explorers" (users who engaged deeply, e.g. completed the 3D walkthrough or customization flow)
- Properties saved/shortlisted
- Enquiries generated
- Site visits booked
- Bookings influenced (attribution back to app engagement)
- Treat this analytics layer as a first-class feature, not an add-on

## 4. Recommended Tech Stack

| Component      | Technology                                                            |
|----------------|-----------------------------------------------------------------------|
| Mobile app     | React Native + Expo                                                   |
| Backend        | FastAPI or Node.js                                                    |
| Database       | PostgreSQL                                                            |
| Storage        | S3-compatible object storage                                          |
| 3D rendering   | Three.js / React Three Fiber concepts, adapted for mobile-compatible rendering |
| AR             | ARKit / ARCore via appropriate React Native native modules            |
| Analytics      | PostHog or Firebase Analytics                                         |
| AI assistant   | LLM connected to the structured property database (specs, pricing, location, amenities) |

## 5. MVP Scope (Keep It Small)

Don't build everything at once — this MVP is enough to demonstrate the business to a first builder client.

### Customer App MVP
1. Property discovery ✅
2. Property details ✅
3. Interactive 3D experience ⬜
4. Room exploration ⬜
5. Floor plan view ◐ (media registry ready)
6. Amenities display ✅
7. Unit availability view ✅
8. Save property ✅
9. Enquiry submission ✅
10. Book site visit ✅

### Builder Dashboard MVP
1. Add project ◐ (API ready, no UI)
2. Add units ◐
3. Add pricing ◐
4. Upload assets (3D/photos/floor plans) ◐ (URL-only)
5. View enquiries ◐
6. Basic analytics (views, saves, enquiries) ◐

**Explicitly deferred to later phases:** AI assistant, full "Customize My Home" live-render flow, compare-properties tool, white-label tooling, advanced analytics/attribution.

## 6. Design Before Code

The complete mobile app architecture and screen UX flow keeps the 3D-experience-first positioning intact — see the screen map in [`mobile/README.md`](./mobile/README.md).
