# PROJECT STATE

## Project
- Name: Martina's K9 System
- Purpose: Manage K9 roster, training sessions/goals/readiness, medical, deployments, handlers, reports
- Status: K9 Roster, Training logs, Boarding, Medical, and Handlers modules implemented; Reports coming soon

## Current Stack
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS v4, react-router-dom
- Backend: Cloudflare Pages Functions (functions/api/*) with D1 binding `DB`
- Database: Cloudflare D1 (`k9_ops_db`), SQL migrations in `migrations/`
- Storage fallback: localStorage when no Pages Functions backend (plain `vite dev`)
- Billing: Paddle Billing API server-side, Sandbox environment configured by Worker bindings/secrets

## Architecture
- K9 APIs support localStorage fallback when Pages Functions are unavailable; dog-linked operational records use per-K9 filtered, paginated Pages Function queries with local paging fallback for boarding. Handler, training, and medical registers support bounded pagination.
- Pages Functions return `{ data }` or `{ success, data }` / `{ success:false, error:{code,message} }`.
- Frontend GET requests use a 30-second in-memory cache with request deduplication, mutation invalidation, workspace/user isolation, and clear-on-logout; cache is cleared when the tab returns to foreground.

## Implemented Features
- [x] Authentication UI and APIs (email/password)
- [x] Vite local-test auth/member account persistence across dev-server restarts (server-side hashed credentials)
- [x] Vite local-test sessions have active subscription and owner write permissions; Cloudflare subscription enforcement is unchanged
- [x] Owner-only user administration with member password reset, archive/restore, permanent delete, and session invalidation
- [x] Developer-secret password reset page and server-side password update
- [x] Dashboard removed; root and unknown routes redirect to K9 Roster
- [x] K9 Roster (list/create/edit/delete, photo, search, filters, and per-dog linked boarding/training/medical/handler/weight/feeding records with incremental paging)
- [x] Boarding stays linked to registered K9 roster records (create/edit/delete, dates, status, owner contact, notes, daily rate/currency and checked-out total)
- [x] Five training registers (Obedience, Detection, Tracking, Protection, Socialization) with linked K9/handler records and CRUD
- [x] Persistent dark/light theme toggle across authenticated pages and authentication screens
- [x] Medical overview, medications, treatment records, and conditions pages with workspace-scoped CRUD APIs
- [x] Workspace-scoped handler directory with create/edit/delete, search, contact details, and position
- [~] K9 Feeding page with searchable inventory-linked food selection, g/kg input stored in grams, and server-side inventory/stock validation; migration `0019_k9_feeding.sql` awaits application
- [x] Workspace-scoped Food Inventory CRUD with usage calculated live from matching feeding food names (feeding grams converted to kg), row-level gram/kg restocking; migration `0023_food_inventory.sql` applied directly to remote D1
- [x] Car Usage register with workspace-scoped CRUD, K9 association, driver/time/odometer fields, and computed distance; migration `0027_car_usage.sql` added but not applied
<<<<<<< HEAD
- [x] Shopping register with owner/member create and owner-only edit/delete; food purchases add kg to matching inventory or create a new item. Migration `0024_shopping.sql` applied to shared remote D1 on 2026-10-16.
=======
- [~] Shopping register with owner/member create and owner-only edit/delete; food purchases add kg to matching inventory or create a new item. Migration `0024_shopping.sql` is not yet applied to remote D1.
- [~] In Season register with heat start/end tracking, workspace-scoped API, owner/member create and owner-only edit/delete, and computed Day 1/7/9/14/21/28 in-app reminders; migration `0025_in_season.sql` is not yet applied remotely.
>>>>>>> season
- [x] K9 Weights register with batch entry/history, persisted per-record difference, and workspace-specific persistent unsaved batch drafts with clear/unselect actions; migration `0021_k9weights_difference.sql` applied to remote D1
- [x] Register pages limit displayed rows to 10 or 20 per page; handler, training, and medical lists use bounded API pagination. Select controls use searchable dropdowns.
- [ ] Reports (ComingSoonPage)

## Database
- `k9_roster` — K9 records (id, dog_name, breed, status, microchip, lineage...)
- Five `k9_training_*` tables — per-discipline date/note records with workspace-scoped K9 and handler foreign keys; migration `0017_training_logs.sql`.
- `boarding_records` — workspace-scoped boarding stays linked by `k9_id` to `k9_roster`; migration `0013_boarding.sql`
- Boarding pricing columns (`currency`, `price_per_day`, `total_amount`) are added by migration `0014_boarding_pricing.sql`; checked-out totals are calculated server-side.
- `k9_medications`, `k9_medical_records`, and `k9_medical_conditions` — workspace-scoped medical formulary, treatment history, and conditions; migration `0015_medical.sql` (not yet applied).
- `k9_handlers` — workspace-scoped handler contact records; migration `0016_handlers.sql` (applied to local D1 only).
- `k9feeding` — workspace-scoped feeding logs linked to K9 and handler records; migration `0019_k9_feeding.sql` (not applied).
- `k9weights` — workspace-scoped K9 weight history with nullable difference from the preceding dated record; migrations `0020_k9_weights.sql` and `0021_k9weights_difference.sql` (applied to remote D1).
- `k9_food_inventory` — workspace-scoped stock entries in kg; `used` and `remaining` are computed from case-insensitive trimmed matches against `k9feeding.food` at read time. Schema applied directly to remote D1; migration ledger status not updated.
- `k9_seasons` — workspace-scoped heat cycle dates and notes linked to `k9_roster`; additive migration `0025_in_season.sql` is not yet applied.
- `k9_car_usage` — workspace-scoped vehicle usage logs linked to `k9_roster`, with driver, times, odometer readings; migration `0027_car_usage.sql` is pending application.

## API
- GET/POST `/api/k9`, GET/PUT/DELETE `/api/k9/:id`
- GET/POST `/api/boarding`, GET/PUT/DELETE `/api/boarding/:id`; writes validate that the selected K9 belongs to the same workspace
- GET/POST `/api/in-season`, GET/PUT/DELETE `/api/in-season/:id`; workspace-scoped season records; create permitted to owner/member, edit/delete owner-only.
- GET/POST `/api/medical/{medications,records,conditions}`, GET/PUT/DELETE `/api/medical/{medications,records,conditions}/:id`; writes are workspace-scoped and validate related K9/medication ownership.
- GET/POST `/api/handlers`, GET/PUT/DELETE `/api/handlers/:id`; handler records and searches are workspace-scoped.
- Creating handlers requires owner `manageMembers` permission; members may view handlers only.
- GET/POST `/api/training/:discipline`, GET/PUT/DELETE `/api/training/:discipline/:id`; discipline is obedience, detection, tracking, protection, or socialization.
- GET/POST `/api/feeding`, GET/PUT/DELETE `/api/feeding/:id`; workspace-scoped feeding records linked to K9 and handler rosters.
- GET/POST `/api/food-inventory`, GET/PUT/DELETE `/api/food-inventory/:id`; workspace-scoped stock records with computed usage and balance.
- GET/POST `/api/car-usage`, GET/PUT/DELETE `/api/car-usage/:id`; workspace-scoped trip logs; create permitted to owner/member, edit/delete owner-only.
- GET/POST `/api/members`, POST `/api/members/create`, PATCH/DELETE `/api/members/:id` — owner-only member administration and direct member account creation
- POST `/api/auth/developer-reset` — verifies `DEV_SECRET_PASS` and resets password by account email
- Legacy POST `/api/auth/forgot-password` and `/api/auth/reset-password` remain implemented but are no longer exposed in frontend routes

## Important Decisions
- Local Pages development is configured with D1 `remote = true` to use the shared remote D1; Vite-only `pnpm dev` does not run Pages Functions and retains localStorage/API fallback. For an isolated additive change, execute only its SQL file rather than applying unrelated pending migrations.
- Local Pages development uses port `8790` because `8788` is occupied in the current environment.
- Wrangler local development uses ignored `.dev.vars` setting `LOCAL_DEV_FULL_ACCESS=true` to bypass subscription gating; deployed payment/subscription enforcement is unchanged. Account roles still apply.
- Training records link to the K9 and handler rosters; the API validates both associations against the active workspace.
- Wrangler D1 binding has `remote = true`; local Pages development and deployed Pages use the shared remote `k9_ops_db`.
- UI conventions: AppShell/Panel components, tactical dark palette with Rajdhani/Inter/JetBrains Mono typography and status badges
- Dark-mode shared panels use a screenshot-inspired forest surface, sage outline, and subtle glow via `.app-panel`; project-wide future UI guidance is in `.clinerules/00-global.md`.
- Theme choice persists in localStorage; dark is the default, with a light content palette and dark navigation sidebar
- Branding assets: `/logo.jpg` for the logo mark and `/Caninelogy.png` for the wordmark

## Environment
- Cloudflare D1 database `k9_ops_db` is bound to Pages Functions as `DB`.
- Production URL: `https://martina-k9-management-system.pages.dev`
- Production Pages still has legacy encrypted `RESEND_API_KEY` and `RESEND_FROM_EMAIL` bindings; the active member reset workflow does not use email.
- Production secret bindings now resolve through the top-level Pages Wrangler config; deployed endpoint returns 403 for an intentionally incorrect secret (expected).

## Recent Changes
- Added Car Usage register with K9 linkage, CRUD API/pages, odometer validation, and migration `0027_car_usage.sql` (typecheck/build pass; migration not applied).
<<<<<<< HEAD
- Applied additive migration `0024_shopping.sql` to shared remote D1; verified migration registry, Shopping table, and both indexes. No unrelated pending migrations or data changes.
=======
- Added In Season heat cycle tracking with computed in-app milestone reminders and additive SQL migration; typecheck and production build pass. Remote SQL check found the table absent; no schema change or deployment performed.
>>>>>>> season
- Added Shopping register and auto-add food purchases to matching/new Food Inventory rows. Typecheck and production build pass; migration `0024_shopping.sql` awaits remote application.
- Added Food Inventory CRUD and live feeding-consumption calculation; additive schema applied directly to shared remote D1. Local Pages D1 binding set to remote; no app deployment performed.
- Added dependency-free frontend API GET caching on branch `perf/shared-api-cache`; auth/billing excluded, requests scoped by user/workspace, mutation invalidation and foreground revalidation included. Seven cache tests plus existing focused suites pass; browser navigation metrics are not yet measured.
- Added a Weights tab to per-K9 linked records using an optional tenant-scoped `dog_id` filter on GET `/api/weights`; displays paged dog-specific measurements and stored differences. Existing workspace/dog index reused; no migration or weight calculation/write changes. Six isolated handler/client tests pass; full 57 focused tests, typechecks and production build pass. Browser interaction check pending.
- Register search changes now debounce for 250 ms with timer cancellation and immediate stale-result invalidation; initial/page loads and manual reloads remain immediate when search is settled. Loader tests expanded to 9; 51 focused tests, both typechecks and build pass. Medical form restored sequential reads to preserve partial-failure behavior, retaining unmount guards. Browser integration and route splitting remain pending.
- Session refresh now coalesces background requests while explicit login/billing refreshes supersede stale reads; logout/unmount invalidate pending results. Shared latest-load protection covers handler, training, medical, feeding and weight registers, including mutation reloads using current filters. Seven session and five loader tests pass; browser integration, debounce and route splitting still pending.
- Training/medical overview cards use opt-in `count_only=true` queries retaining existing joins/filters and default list contracts; 25 isolated handler tests pass. Medical form reads run concurrently with unmount protection; shared shell has skip navigation. Boarding tests 10/10, both TypeScript checks and production build pass. Real-D1 count equivalence, browser checks, route splitting, session deduplication and search protection remain pending.
- Optimization branch `optimization/local-baseline-2026-10-14` from `ea4a2dd`; synthetic authenticated baseline passes 17 check groups. Boarding client now skips redundant roster fetches for complete joined responses, retaining partial-response enrichment and offline fallback; 10 focused tests, frontend typecheck and build pass. Measurements/rollback in `.cline/PERFORMANCE_BASELINE.md`; full workflow/browser coverage and remaining optimizations pending.
- Added owner-only member archive/restore and permanent deletion; archived members cannot sign in and do not count toward active seats (migration `0022_member_archiving.sql`, not yet applied remotely).
- Added K9 Feeding page, workspace-scoped CRUD API, and migration `0019_k9_feeding.sql`; remote D1 migration is pending approval/application.
- Added K9 weight history difference tracking, removed record nickname editing, and applied migration `0021_k9weights_difference.sql` to remote D1.
- Connected K9 feeding food selection to Food Inventory, added g/kg amount entry with gram persistence, and enforced inventory existence and available-stock validation on create/edit.
- Renamed the Food Inventory create action to “New food” and added per-entry restocking in grams or kilograms, accumulating stock on the existing record.
- Added feeding records to the K9 operational-relationships panel with workspace-scoped per-dog API filtering and incremental pagination.
- Persisted selected dogs and unsaved weights/date across refresh, navigation, and logout; added a Clear list action.
- Added shared searchable dropdown and pagination controls; wired bounded handler, training, and medical register queries. Boarding and K9 roster pages use client-side pagination over loaded lists.
- Added per-dog bounded loading and incremental pagination for operational links on K9 records; API list endpoints optionally return totals with a capped page size.
- Added owner-created member accounts using existing hashed user credentials/memberships; members can add records but cannot edit, delete, access reports, subscription, or user administration. Migration `0018_member_account_index.sql`.
- Extended the Vite development auth bridge to create and sign in as local-test members with member permissions.
- Restricted handler creation to owners in the API, route, and UI.
- Added a per-K9 linked-record panel to the edit view with dog-specific boarding, training, medical, and training-handler details.
- Added five workspace-scoped training logs linked to K9 and handler rosters; migration `0017_training_logs.sql`.
- Added handler directory and workspace-scoped CRUD; migration `0016_handlers.sql` applied to local D1 only.
- Added local Pages/D1 workflow scripts and a local-only full subscription access flag; deployed payment enforcement remains active.
- Added medical overview, medication formulary, K9 treatment records and condition history with workspace-scoped CRUD; migration `0015_medical.sql` is pending application.
- Added boarding daily price/currency and persisted checkout totals (migration `0014_boarding_pricing.sql`).
- Added persisted light/dark themes and updated login/sidebar branding assets
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
- Apply migration `0017_training_logs.sql` to remote D1 before using training logs in production; migrations `0015_medical.sql` and `0016_handlers.sql` also remain pending remotely.
- [ ] Verify a real password reset using the configured secret and a known account.
- [ ] Verify owner-driven password reset against an existing member account.
- [ ] Complete Paddle Sandbox checkout and webhook round-trip. Do not enable live payments without approval.

## Known Limitations
- Training logs require the Pages Functions/D1 backend; they do not provide a localStorage fallback.

