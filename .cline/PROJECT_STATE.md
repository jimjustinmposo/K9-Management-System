# PROJECT STATE

## Project
- Name: Martina's K9 System
- Purpose: Manage K9 roster, training sessions/goals/readiness, medical, deployments, handlers, reports
- Status: K9 Roster + Training modules live; other modules coming soon

## Current Stack
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS v4, react-router-dom
- Backend: Cloudflare Pages Functions (functions/api/*) with D1 binding `DB`
- Database: Cloudflare D1 (`k9_ops_db`), SQL migrations in `migrations/`
- Storage fallback: localStorage when no Pages Functions backend (plain `vite dev`)
- Billing: Paddle Billing API server-side, Sandbox environment configured by Worker bindings/secrets

## Architecture
- `src/lib/k9Api.ts`, `src/lib/trainingApi.ts` call `/api/*` endpoints; on network failure or non-JSON response they fall back to localStorage records.
- Pages Functions return `{ data }` or `{ success, data }` / `{ success:false, error:{code,message} }`.

## Implemented Features
- [x] Dashboard
- [x] K9 Roster (list/create/edit/delete, photo, search, filters)
- [x] Training page: sessions list + filters + stats, New Session modal, Goals panel + New Goal modal, K9 readiness panel
- [ ] Medical, Handlers, Reports (ComingSoonPage)

## Database
- `k9_roster` — K9 records (id, dog_name, breed, status, microchip, lineage...)
- `training_types` — categories (seeded: Obedience, Detection, Tracking, Agility, Protection, Search & Rescue, Therapy, Socialization)
- `assessment_criteria` — weighted 0–10 criteria per training type (seeded, is_critical flags)
- `training_sessions` — FK `k9_id` → k9_roster (CASCADE), FK training_type_id → training_types
- `training_assessments` — per-session criterion scores, UNIQUE(session_id, criterion_id)
- `training_goals` — FK `k9_id` → k9_roster, optional training_type_id/criterion_id

## API
- GET/POST `/api/k9`, GET/PUT/DELETE `/api/k9/:id`
- GET/POST `/api/training` (sessions, filters: k9_id, training_type_id, status, search)
- GET/POST `/api/training/types`
- GET/POST `/api/training/goals` (filter: k9_id, status)

## Important Decisions
- Training types/criteria seeded via `migrations/0003_seed_training_types.sql` (INSERT OR IGNORE)
- Readiness scoring (GREEN/YELLOW/RED) computed client-side in `src/types/training.ts` `calculateReadiness()`
- UI conventions: AppShell/Panel components, navy/gold palette, badge styles per status

## Environment
- Cloudflare D1 database `k9_ops_db` is bound to Pages Functions as `DB`.
- Production URL: `https://martina-k9-management-system.pages.dev`

## Recent Changes
- Enabled `/training` route with full TrainingPage (sessions, goals, readiness)
- Added trainingApi.ts, /api/training/types.ts, /api/training/goals.ts
- Added 0003 seed migration for 8 training types + 40 assessment criteria
- Added owner/member authentication and subscription-based write permissions on Cloudflare Pages Functions.
- Paddle `active` status plus an unexpired billing period is the sole condition for write access; inactive workspaces remain view-only, with billing management available to owners.
- Removed the PayPal integration; billing controls are unavailable until a replacement provider is connected.
- Added Paddle billing migration, authenticated transaction/portal endpoints, signed webhook synchronization, and frontend Paddle.js checkout/portal flow. D1 migration 0010 is applied locally and remotely. Wrangler confirms the production Pages project currently has no secrets configured, so Paddle checkout remains unavailable until credentials are added.
- Added and applied migration 0011 to restore a missing `workspaces` table in local and remote D1; remote `sqlite_master` verification confirms the table exists.
- Fixed Paddle webhook's subscription-period column and made unmatched workspace updates fail/retry instead of being acknowledged. Production D1 still has no delivered Paddle webhook events; source fix requires deployment and Paddle destination verification.
- Subscription page now routes canceled/expired subscriptions to a new checkout and offers “Subscribe again”; current subscriptions remain on billing management.
- Removed the Deployments page/route and added Subscription to the application navigation.

## Next Steps
- [ ] Configure required Paddle production Pages secrets/variables, then complete Sandbox checkout and webhook round-trip; verify Resend credential rotation separately. Do not enable live payments without approval.
- Add edit/delete for sessions and goals; assessment scoring UI per session
- Medical module

## Known Limitations
- Training types list falls back to localStorage if API unreachable (seeded types won't appear offline until fetched once)
- No PUT/DELETE endpoints for training sessions/goals yet
