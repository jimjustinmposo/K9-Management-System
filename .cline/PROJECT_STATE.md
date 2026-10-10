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
- [x] Authentication UI and APIs (email/password)
- [x] Vite local-test auth account persistence across dev-server restarts (server-side hashed credentials)
- [x] Vite local-test sessions have active subscription and owner write permissions; Cloudflare subscription enforcement is unchanged
- [x] Owner-only user administration with manual member password reset and session invalidation
- [x] Developer-secret password reset page and server-side password update
- [x] Dashboard removed; root and unknown routes redirect to K9 Roster
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
- PATCH `/api/members/:id` — owner-only manual member password reset
- POST `/api/auth/developer-reset` — verifies `DEV_SECRET_PASS` and resets password by account email
- Legacy POST `/api/auth/forgot-password` and `/api/auth/reset-password` remain implemented but are no longer exposed in frontend routes

## Important Decisions
- Training types/criteria seeded via `migrations/0003_seed_training_types.sql` (INSERT OR IGNORE)
- Readiness scoring (GREEN/YELLOW/RED) computed client-side in `src/types/training.ts` `calculateReadiness()`
- UI conventions: AppShell/Panel components, tactical dark palette with Rajdhani/Inter/JetBrains Mono typography and status badges

## Environment
- Cloudflare D1 database `k9_ops_db` is bound to Pages Functions as `DB`.
- Production URL: `https://martina-k9-management-system.pages.dev`
- Production Pages still has legacy encrypted `RESEND_API_KEY` and `RESEND_FROM_EMAIL` bindings; the active member reset workflow does not use email.
- Production secret bindings now resolve through the top-level Pages Wrangler config; deployed endpoint returns 403 for an intentionally incorrect secret (expected).

## Recent Changes
- Local Vite auth now grants active subscription permissions for feature testing without changing deployed Cloudflare behavior.
- Improved signup panel button contrast and local-test account sign-in flow; local Vite accounts persist across restarts.
- Fixed Pages production configuration and redeployed the developer-secret reset flow; invalid-secret production probe correctly returns 403.
- Deployed owner-only Users page and manual member password reset; resets invalidate the member's sessions and outstanding reset tokens.
- Removed self-service forgot/reset routes from the frontend and directs users to their administrator.
- Hardened legacy forgot/reset-password APIs with validated email, one-hour one-use tokens, and session invalidation.
- Removed Google and Facebook login UI, OAuth endpoints, provider configuration, and deployment setup.
- Replaced login/register screens with a responsive animated auth switch using the navy/gold palette and existing auth APIs.
- Added Lucide React for authentication form icons.

## Next Steps
- [ ] Verify a real password reset using the configured secret and a known account.
- [ ] Verify owner-driven password reset against an existing member account.
- [ ] Complete Paddle Sandbox checkout and webhook round-trip. Do not enable live payments without approval.
- Add edit/delete for sessions and goals; assessment scoring UI per session
- Medical module

## Known Limitations
- Training types list falls back to localStorage if API unreachable (seeded types won't appear offline until fetched once)
- No PUT/DELETE endpoints for training sessions/goals yet
