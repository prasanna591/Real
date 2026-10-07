# PropTech Platform — Enhancement Strategy

**North star:** become the *social discovery layer for property* — where buyers browse, save, share, and transact, and where builders receive measurable, qualified demand (which funds the platform).

Everything below serves funnel conversion (buyer side) or builder retention/monetization (supply side).

---

## 1. Product — close the social-feedback loop

Phase 1 (social proof: save/view counters, trending, share attribution) is live end-to-end. Phase 2 (follow + feed) is now live: customers can follow builders, and the Home tab surfaces a personalised timeline of new projects + unit drops from followed builders alongside the existing project discovery feed.

The funnel currently bottoms out at enquiry/walkthrough, so the next visible step is closing the loop:

- **Phase 2 — Follow + Feed**: `(tabs)/index` becomes a feed. Follow builders; show new-project/unit drops, "X added N units at Y" style entries, sorted by recency + engagement. Builds on Phase 1 counters.
- **Phase 3 — Engagement loops**: notifications (new units, price changes), "as popular as" rails, weekly digest, and a **referral program** built on the Phase 1 `?ref=` links (viral coefficient K measured from `ref_user_id`).
- **Enquiry feedback loop**: mobile "My enquiries" with a visible status state machine (new → viewed → contacted → booked) so customers feel their action mattered.
- **Builder lead scoring**: derive "hot leads" from view+save+share+enquiry activity per project; surface in the dashboard lead pipeline. This turns the app into a demand-generation tool — the moat.
- **Trust layer** (high-value for real estate): verified-listing badge, RERA/site-approval display, clear floor plans, and online **token booking** (refundable) as the conversion accelerator.

## 2. Application — kill the identity debt

Biggest technical debt: customer identity is a **caller-supplied phone id with no token**; saves/enquiries are unauth'd by design.

- Introduce a **real customer session**: OTP verify → token → `Authorization`; keep the idempotent phone sign-in UX.
- Migrate save/enquiry endpoints to authenticated calls.
- Unify the two identity models (customer vs builder/admin) behind one auth layer with scopes/roles.

## 3. Reliability & scale foundations

- **SQLite → PostgreSQL** in prod (docker-compose exists); make Alembic the only source of truth (retire `create_all` reliance).
- **Media**: switch to the S3 presigned flow in prod (already supported, just not configured).
- **Redis**: rate-limit store + async analytics ingestion (view bumps must not block reads) + engagement queue for notifications.
- **Observability**: structured logs, error tracking (Sentry), API metrics (latency/error rate), uptime alert.
- **CI/CD**: GitHub Actions running `pytest`, `alembic check`, mobile `tsc` + `expo lint`, then auto-deploy to a staging Postgres instance.

## 4. Process — engineering hygiene

- Clear the mobile **baseline lint debt** (10 pre-existing errors) so `expo lint` can be a CI gate; add pre-commit.
- Contract-snapshot tests for the API; seed/prod parity for demos.
- Feature-flag non-trivial releases; keep versioned `/api/v1` with a documented breaking-change policy.
- Standardize commit/PR review flow and commit conventions.

## 5. Data & analytics

- **Funnel P&L**: view → save → enquiry → walkthrough → booking conversion per builder/project; charts in the builder app.
- **Referral metric**: viral coefficient K from share events (data already collected via `ref_user_id`).
- **Experimentation**: A/B on card layout, sort logic, share copy — measure save-rate and enquiry-rate lift.

## 6. Prioritized roadmap

| Horizon | Focus |
|---|---|
| **0–30d** | Customer OTP auth; Postgres migration; Home→Feed (Phase 2); CI pipeline; fix lint baseline |
| **30–60d** | Phase 3 engagement loops + referral launch (uses `?ref=`); builder lead-scoring + funnel charts; enquiry status app |
| **60–90d** | S3 prod + Redis queues; token booking; SEO landing pages for `proptech.app/p/{id}` so share links drive organic traffic |

## 7. Metrics

DAU / sessions, projects saved & shared, save→enquiry conversion, viral coefficient K, leads/builder/month, builder churn.

## 8. Key risks

- Unauth'd customer data — fix first (identity debt, §2).
- Trust / fake-listing perception — mitigate with verified badges.
- SQLite→Postgres data-loss — staging + backfill rehearsal before cutover.
- Rate-limiter gaps on new hotspots — audit with a load test as features ship.