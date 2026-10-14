# Optimization protection and baseline

## Protected starting point
- Date: 2026-10-14.
- Starting branch: `fast-front-back`; clean working tree.
- Starting commit: `ea4a2dd98ef7d489100277d9d9d40fdd743ed26e`.
- Optimization branch: `optimization/local-baseline-2026-10-14`.
- No commits, pushes, deployments, remote migrations, or production API calls performed.

## Isolation and backup
- `wrangler.toml` now explicitly sets D1 `remote = false` for development; deployed database identity is unchanged.
- Original local state under `.wrangler/state` was not migrated or reset.
- Consistent SQLite backup: `.wrangler/backups/pre-optimization-20261014-092604.sqlite` (ignored by Git; contains private local data).
- Backup SHA-256: `419df71a8a366b9c484bf6700bcbd9980215eb6bba7c43f6ebc4816040b58ef8`.
- Separate copied state: `.wrangler/performance-baseline`.
- Applied existing additive migrations 0019–0022 only to the copy using explicit `--local --persist-to`.
- Verified original table rows against backup; verified existing application rows preserved in migrated copy. Integrity and foreign-key checks passed; copied migration count is 22.

## Checks and measurements
- Unchanged application: `pnpm build` passed, Vite reported 1.28 s.
- Entry JS: 421.19 kB raw / 115.28 kB Vite-reported gzip.
- Entry CSS: 57.92 kB raw / 10.77 kB Vite-reported gzip.
- Frontend and backend TypeScript no-emit checks passed.
- Local Pages Worker compiled and reported DB mode `local` on loopback port 8791.
- Five anonymous GETs each to session, roster, boarding, weights, feeding: all 25 returned 401.
- Median localhost anonymous-response times: session 10.84 ms; roster 3.88 ms; boarding 15.76 ms; weights 7.03 ms; feeding 10.38 ms. These do not measure authenticated SQL or production latency.
- Server stopped after smoke checks.
- Existing redirect warning: `public/_redirects` SPA rule was ignored by Wrangler as an infinite-loop risk; left unchanged.

## Remaining baseline work
- Authenticated synthetic baseline now passes 17 named check groups (2026-10-14); see below. Full workflow/browser coverage is still pending.
- `pages:baseline` still loads existing `.dev.vars`. CLI binding requests subscription bypass off, but effective secret precedence was not authenticated-tested. Do not use it for billing/email tests until external credentials are isolated and bypass behavior verified.
- Create synthetic users/workspaces in disposable local fixtures; verify active/read-only subscriptions, permissions, tenant isolation and existing calculations.
- Capture authenticated API p50/p95, response sizes, query counts and browser cold/warm navigation metrics under fixed conditions.
- No browser metrics, full regression suite, representative-load benchmark, or optimization benefit verified yet.
- Production backup and migration status remain unknown; remote access requires separate approval.

## Rollback
- No application behavior optimization or new migration was introduced in this slice.
- Review/reverse only the added package scripts and development `remote` flag if needed; do not use a repository reset or overwrite unrelated work.
- Keep original local state and the backup. The migrated copy can remain unused; no destructive down-migration is required.
- For a restore, stop the relevant local Worker first and restore into a new state directory using SQLite backup, not over a live database/WAL pair.
- Review future optimization changes as separate reversible commits; no commits have been created yet.

## Authenticated synthetic baseline (2026-10-14)
- Added dependency-free Python harness `scripts/baseline-api.py`; Python 3.11 was already available. No packages installed.
- Sandbox: `%TEMP%/martina-k9-auth-baseline`, outside the repository. Schema copied from the verified migrated local database; no customer rows copied. 1,025 synthetic dogs across two active tenants plus read-only/expired owner and archived-member fixtures. Random passwords stored only in the sandbox, never logged.
- Important discovery: launching the initial nested `.wrangler/auth-baseline` sandbox caused Wrangler to load the repository's parent `.dev.vars`. That server was stopped before test requests. Use the external temporary sandbox, not the nested copy, for regression tests.
- External sandbox startup verified local D1 and only APP_URL/LOCAL_DEV_FULL_ACCESS application bindings; no Paddle, Resend or developer-reset secret bindings. Authenticated read-only/expired tests verified subscription bypass was off.
- Harness refuses redirects/proxies and billing routes; checks startup isolation and source/copy equivalence before tests.
- Passed login (valid/invalid/archived), owner/member permissions, read-only/expired subscriptions, tenant list/detail/update/delete isolation, origin validation, K9 CRUD, boarding inclusive-day pricing/pagination, stored weight differences, and logout invalidation. All responses checked for `no-store`.
- Initial test expected cross-tenant K9 DELETE to return 404. Existing code returns 200 for a workspace-scoped no-op; test corrected to preserve that contract and verify the target record remains intact. No application code changed.
- Final run: 30 warm sequential requests per endpoint. Session median/p95 19.62/24.84 ms, roster 26.71/31.37 ms (347,010 bytes; 1,000 photo-free dogs), boarding 18.52/29.77 ms, weights 19.30/25.42 ms, feeding 19.40/27.78 ms, obedience 20.00/27.92 ms, medical records 16.22/29.94 ms. Non-roster list benchmarks were empty (21-byte responses), not representative operational datasets.
- Result: `%TEMP%/martina-k9-auth-baseline/result-1791956381728901200.json`. Not production, browser, concurrent-load, Worker CPU, or D1 row-read measurements.
- Rerun: start Wrangler from the external sandbox with `wrangler pages dev --ip 127.0.0.1 --port 8791 --persist-to state`, capturing stdout to `server.stdout.log`; then run `python -B scripts/baseline-api.py test` from the repository. Preparation refuses to overwrite an existing sandbox. After source changes, use a fresh sandbox snapshot before comparisons; preserve prior results.

## Optimization 1: boarding roster request waterfall
- Changed only the boarding client mapping path; backend, database, pricing calculations, subscriptions and permissions unchanged.
- Complete joined list/get/create/update responses now map directly. Missing/null dog fields still trigger one roster lookup per response. Empty strings are preserved, not treated as missing values. Existing local-storage fallback is unchanged.
- Actual client-module tests with isolated fetch/storage dependencies: 10/10 passed before and after. Complete-response request counts decreased from 2 to 1 for all four operations. Partial-row enrichment, response/payload equivalence, 404, 401/403/500, network/Vite fallback CRUD, inclusive-day pricing and per-dog pagination verified.
- Repeat with `pnpm test:boarding` (Node built-in tests plus existing TypeScript transpiler; no dependencies added). `--baseline` is only for the original pre-optimization source, not current code.
- Frontend no-emit typecheck and production build passed. Build JS 421.30 kB / 115.36 kB gzip vs baseline 421.19 / 115.28 kB; this optimization targets network requests, not bundle size.
- For the earlier 1,000-dog fixture, skipping the roster request avoids its measured 347,010-byte JSON response each time. No browser wall-clock speedup has been measured; test execution times are not application latency benchmarks.
- Rollback: reverse the `mapServerRows` helper and its four call-site changes in `src/lib/boardingApi.ts`; no migration or data rollback required. Keep the tests and prior baseline results.

## Optimization 2: overview totals and independent form reads
- Training and medical list handlers accept opt-in `count_only=true`, returning `{ data: [], total }` using the same workspace-scoped joins and filters as paginated totals. Default full-list and paginated responses remain unchanged. This is an additive query option, not a replacement of existing API contracts.
- Training/medical overview clients request totals rather than downloading all records. SQL COUNT still reads matching database rows; no D1 row-read reduction or latency improvement is claimed.
- Medical form reads are sequential again to preserve original partial-success/error ordering; each roster/medication result is guarded against unmount. The earlier Promise.all optimization was removed because it changed partial-failure behavior.
- Shared shell includes a keyboard skip-to-content link and focusable main target; keyboard/browser verification remains pending.
- Added `scripts/count-api.test.mjs` / `pnpm test:counts`: 25 tests pass across five training disciplines and three medical resources. Actual handler modules run with auth/D1 spies to check count/list SQL equivalence, bound filters/tenant IDs, defaults, pagination, denied authentication, empty totals, sanitized failures and invalid discipline. These tests do not execute SQL or replace tenant-isolation integration tests.
- Boarding tests: 10/10 pass. Frontend/backend TypeScript checks and production build pass. Built JS is 421,738 bytes; no browser speed measurement performed. No dependencies, database changes, production access or deployments.
- Verification used direct installed Node entrypoints after an initial command stalled at Git's pager; use `git --no-pager` for future review commands.
- Rollback: reverse count branches, client count methods and overview call sites together; independently reverse medical-form concurrency or shell skip navigation if needed. No data rollback required. Preserve prior baseline results; sandbox source snapshots have not been refreshed or rerun for this slice.
- Next: real-D1 populated count equivalence/performance checks, form failure-path/browser checks, session in-flight deduplication, search race protection, and route splitting with loading/error recovery. Indexes and billing/batch-write changes remain deferred pending evidence/risk review.

## Optimization 3: session and register request races
- Provider-local session coordinator coalesces only background refreshes (poll, focus, visibility). Explicit refreshes after authentication/checkout supersede older reads. Poll frequency, endpoint contracts, permissions and subscription evaluation are unchanged; no persistent session cache added.
- Logout blocks new session reads while pending and invalidates older results; unmount/effect restart ignore stale responses. Logout network errors still reject to the caller, but background refresh callers do not inherit that rejection.
- Shared latest-load coordinator and hook protect handler, training, medical, feeding and weight register results, errors and loading state against out-of-order reads. Captured post-mutation reload callbacks use the current committed query; unmounted reloads do nothing. Existing requests are not canceled, and debounce is not yet implemented.
- Added `test:session` (7 tests) and `test:loads` (5 tests), exercising actual standalone coordinators through existing TypeScript transpilation. These are not mounted React or browser integration tests. Together with boarding/count tests, 47 focused tests pass; frontend/backend typechecks and build pass. Bundle reported 422.33 kB / 115.81 kB gzip before final background-error guard; no measured browser speedup.
- Rollback: restore previous AuthProvider request handling and list loaders, then remove the three coordinator/hook modules. No database or data rollback required. All changes remain uncommitted; no production access, migrations, deployments or dependency installations.
- Remaining: browser lifecycle/navigation validation, search debounce, route splitting, populated local-D1 checks, medical-form partial-failure parity, and evidence-led index review. Billing processing and weight-write semantics remain unchanged.

## Optimization 4: debounce and failure-path preservation
- Shared register loading delays changed search text by 250 ms, invalidates old results immediately, and cancels superseded/unmounted timers. Settled-search pagination/initial requests run immediately. Manual mutation reloads cancel pending timers and execute the current query immediately. Applies to handlers, training, medical formulary, feeding and weights.
- Medical form concurrency removed: sequential roster, medication and record reads preserve the original partial-success ordering, with added unmount guards. No claim of form waterfall reduction remains.
- Loader tests expanded from 5 to 9: rapid changes, canceled timers, immediate manual reload without duplicate timer requests, and zero-delay reads. All 51 focused tests pass, frontend/backend typechecks pass, production build passes (422.57 kB JS / 115.92 kB gzip), diff check passes.
- Tests execute standalone coordinators, not mounted hooks. Browser typing, pagination-reset timing, accessibility, routing and full authenticated integration still need verification. No new browser or D1 performance measurements.
- Rollback debounce independently by removing scheduler/search wiring in the loader/hook and five register call sites; keep latest-response protection. No database, deployment or dependency changes.

## Feature: per-K9 weight history in linked records
- Added Weights as a fifth linked-record tab, using the existing timeline/card style and sage-positive tokens. Shows date, kg, saved nickname and persisted difference (or Initial), paginated in batches of 10.
- Added optional `dog_id` GET filter to `/api/weights`. The mandatory authenticated `w.workspace_id = ?` predicate remains; filter is parameter-bound and applies to both rows and total. No `dog_id` means legacy query behavior is unchanged.
- Added `weightsApi.listForK9`; existing `idx_k9weights_workspace_dog` migration index is reused; no schema/data/write/calculation/permission changes.
- Added `test:weights`, six isolated handler/client tests for tenant-scoped filter/bindings, pagination/order/search legacy behavior, blank filter, denied auth, sanitized DB errors and encoded client URL. These tests inspect handler SQL using D1 spies, not actual database execution.
- Validation: all 57 focused tests pass (10 boarding, 25 count, 7 session, 9 latest-load, 6 weights), frontend/backend TypeScript checks pass, production build passes (424.01 kB JS / 116.27 kB gzip), `git diff --check` passes.
- Browser click-through with an existing K9 and actual weight history is still pending. No migration, production access, deployment, dependency installation or commit.
- Rollback: remove weights endpoint filter, client method, tab state/fetch/render branches and focused test/script entry. No data rollback required.