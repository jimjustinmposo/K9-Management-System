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
- [x] Authentication UI and APIs (email/password plus Google and Facebook OAuth)
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
- `oauth_accounts` — provider identity links for Google/Facebook login

## API
- GET/POST `/api/k9`, GET/PUT/DELETE `/api/k9/:id`
- GET/POST `/api/training` (sessions, filters: k9_id, training_type_id, status, search)
- GET/POST `/api/training/types`
- GET/POST `/api/training/goals` (filter: k9_id, status)
- GET `/api/auth/oauth/:provider`, GET `/api/auth/oauth/callback/:provider`

## Important Decisions
- Training types/criteria seeded via `migrations/0003_seed_training_types.sql` (INSERT OR IGNORE)
- Readiness scoring (GREEN/YELLOW/RED) computed client-side in `src/types/training.ts` `calculateReadiness()`
- UI conventions: AppShell/Panel components, navy/gold palette, badge styles per status

## Environment
- Cloudflare D1 database `k9_ops_db` is bound to Pages Functions as `DB`.
- Production URL: `https://martina-k9-management-system.pages.dev`
- OAuth requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_APP_ID`, and `FACEBOOK_APP_SECRET`.

## Recent Changes
- Added Google and Facebook OAuth login with CSRF state validation, account linking/creation, and provider identity storage.
- Replaced login/register screens with a responsive animated auth switch using the navy/gold palette and existing auth APIs.
- Added Lucide React for authentication form icons.
- Added Paddle billing migration, authenticated transaction/portal endpoints, signed webhook synchronization, and frontend checkout/portal flow.
- Fixed Paddle webhook subscription-period synchronization and unmatched-workspace retry behavior.

## Next Steps
- [ ] Configure required Paddle production Pages secrets/variables, then complete Sandbox checkout and webhook round-trip; verify Resend credential rotation separately. Do not enable live payments without approval.
- Add edit/delete for sessions and goals; assessment scoring UI per session
- Medical module

## Known Limitations
- Training types list falls back to localStorage if API unreachable (seeded types won't appear offline until fetched once)
- No PUT/DELETE endpoints for training sessions/goals yet
