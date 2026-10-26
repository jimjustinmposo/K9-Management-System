# Paddle migration readiness — NOT ready to deploy

## Verified baseline and backups
- Source baseline: `5a46d29fe0a1b59b8fa10f0bce96b7917943e84b`; working tree was clean.
- Configured D1: `k9_ops_db`, ID `a67e5d3b-d14f-44b0-92c8-ee708c85a642`. Actual deployed Pages version/configuration has NOT been recorded; source HEAD is not proof of deployed version.
- Backup directory: `C:\Users\justin\k9-backups\paddle-prelive-20261026-073405`.
- Source archive: `k9-backup-20261026-0728.tar`; 292 members; excludes ignored secrets/local state.
- Database export: `k9-d1-backup-20261026-0728.sql`; 689420 bytes. Imported into isolated in-memory SQLite: integrity `ok`, zero FK violations, 5 workspaces, 8 users, 8 memberships, 33 sessions, 193 webhook events, 28 migration records.
- SHA-256 hashes and verification results are in `verification.json` in the backup directory. This is not a D1 restore drill or an off-device/encrypted backup. Treat the SQL as sensitive customer/authentication data; do not upload it or commit it.
- Earlier export contacted remote D1 and Wrangler warned about temporary query unavailability. Do not repeat without an approved maintenance window.
- Earlier tool output exposed sandbox API/webhook credentials. Rotate them before sandbox E2E; do not paste replacements into chat. Check exposure of database/authentication records in the earlier transcript as well.

## Local changes in this preparation phase
- Config/checkout reject mismatched key/token environments and malformed/duplicate price IDs. API requests pin authorization, API version and host and refuse redirects; provider error bodies are not logged.
- `PADDLE_CHECKOUT_ENABLED=false` pauses new checkout/config responses without disabling portal or webhook endpoints.
- Production checkout has an unconditional readiness gate until the remaining migration is implemented. Do NOT deploy this partial phase as a live integration.
- Raw-body HMAC verification retains five-second tolerance and supports multiple h1 signatures using Web Crypto verification.
- Optional V2 path implemented locally behind `BILLING_V2_ENABLED=true`: environment-scoped subscriptions/checkouts/receipts, verified originating transaction association, canonical subscription reads, atomic receipt/state batches and monotonic microsecond versions. Default path remains unchanged; no remote schema/data changes.
- Additive schema: `migrations/0030_billing_isolation.sql`. Legacy snapshot candidate: `scripts/billing-cutover.sql`. V2 access uses environment-specific active subscriptions or fixed production legacy grants. Existing roles/archive restrictions remain in the session path.
- 27 focused tests pass (13 V2, seven safety, seven existing session-controller); frontend/backend typechecks and build pass (bundle-size warning). SQLite backup-copy rehearsal: integrity ok, zero FK violations, legacy workspace rows unchanged, one eligible grant. This is NOT a D1 rehearsal or proof of current production eligibility.
- Source safety snapshot before V2 edits: `C:\Users\justin\k9-backups\pre-v2-source-20261026-080755` (environment files excluded).

## V2 limitations and remaining release gates
- Keep V2 OFF on existing deployments until schema, trusted association backfill and legacy snapshot are reviewed and applied. The production checkout gate remains unconditional.
- Atomic receipt/state processing has no persistent processing lease to strand; failed events receive 503 and depend on provider redelivery. A durable failed-event inbox, operational replay/resync tooling, retry-exhaustion alerts and D1-runtime tests remain outstanding.
- Unknown subscription updates return 503 until a verified creation event establishes association. Existing subscriptions require explicit trusted backfill; metadata/email alone is not accepted.
- Ambiguous transaction creation locks the checkout attempt in creating/review rather than creating duplicates. Support reconciliation/release tooling is NOT implemented. Completed/expired abandoned checkout recovery remains a release blocker.
- Price validation checks configured environment API, product, active price and recurring interval. Approved amounts/currency/trials and frontend displayed pricing still need verification/enforcement.
- `scripts/billing-cutover.sql` is a reviewed-execution candidate only, not a runnable production instruction: validate all dates/statuses first, execute snapshot/marker atomically using a D1-compatible tested path, and verify no post-backup access changes. SQLite execution alone does not establish remote atomicity. Never rerun to extend grants.
- `wrangler.billing-local.toml` uses an inert database ID and `remote=false`. No sandbox server was started. Before use, isolate the working directory/environment files as well: existing root `.dev.vars` may override bindings and contains unrotated credentials. Do not use default development commands for sandbox tests.
- No live catalog/destination/domain/secret verification, deployed-version inventory, D1 restore drill, browser E2E, production migration or deployment was performed.

## Blocking work still required
1. Isolate sandbox/live checkout attempts, customer/subscription associations and event inbox by environment, with DB uniqueness constraints. Never infer environment from a `pri_` ID. Verify catalog price/product ownership, recurring intervals, currency, amount and status against the correct API account.
2. Store trusted server-created checkout attempt/transaction associations before returning checkout to the browser. Reject cross-workspace subscriptions; do not trust custom_data alone. Handle API-success/DB-failure recovery without creating duplicate subscriptions.
3. V2 now uses atomic receipt/state batches; verify against actual isolated D1 and complete operational replay/reconciliation. The default legacy handler still has the earlier processing gaps.
4. Approved transition policy: preserve existing access until each workspace's existing paid-through date, then require verified live billing. Optional V2 grant/access code and candidate snapshot SQL are implemented locally, not activated. Missing/invalid paid-through dates require review; do not invent indefinite grants or silently revoke access.
5. Reconcile only from verified subscription state. A transaction.payment_failed event alone must not force a subscription to past_due. Preserve cancellation-at-period-end, renewal, pause/resume and scheduled-change semantics. Resync requires environment-scoped trusted associations and concurrency-safe ordering first.
6. Ensure local/staging D1 is isolated: current wrangler.toml has remote=true and is NOT safe for sandbox tests. Do not run dev:pages or database seed against that binding. Prepare separate local/preview config before integration testing.
7. Record actual Pages production deployment ID, build commit, bindings, variable names/nonsecret values, secret names, routes and custom domains through read-only inspection. Never dump secrets.

## Validation remaining
Local safety tests do not prove webhook idempotency or lifecycle correctness. Still required: real isolated SQLite/D1 concurrent delivery, failed-write retry, stale worker, out-of-order/tied timestamp, account spoofing, unknown price, environment isolation, legacy access and role tests; checkout callbacks must not grant access. Sandbox end-to-end must use rotated sandbox credentials, isolated DB, an explicitly sandbox notification destination and test payment details. No live checkout, charges or subscriptions may be initiated.

## Live dashboard checklist (not executed)
- Complete live account/business verification; confirm approval of the exact checkout hostname and set the default payment link to a page that actually loads Paddle.js.
- Create/review live product `<LIVE_PRODUCT_ID>`, monthly `<LIVE_MONTHLY_PRICE_ID>` and annual `<LIVE_YEARLY_PRICE_ID>`; confirm amount/currency/tax settings, intervals and trials. Current UI prices are hardcoded and must be reconciled.
- Create live client token `<LIVE_CLIENT_TOKEN>` and restricted server key `<LIVE_API_KEY>` with only operations used by the completed implementation (transaction write/read, subscription read, catalog reads and customer portal session write as required). Confirm exact permission names from current API reference before creation.
- Create live notification destination `<LIVE_WEBHOOK_URL>` with `<LIVE_WEBHOOK_SECRET>`, separate from sandbox; use real-event traffic only for production entitlement processing. Subscribe to supported subscription lifecycle and transaction events, not indiscriminately all events.
- Store secrets only in production server bindings. No live IDs or secrets have been supplied or configured. All dashboard/resource/secret changes require explicit approval.

## Cutover approval sequence — blocked, not executable yet
1. Complete blocking work using the approved paid-through-date legacy policy; pass the test matrix and sandbox E2E.
2. Approve a maintenance/export window; capture current deployment/configuration and a fresh backup. The existing export becomes stale as customers use the app.
3. Approve exact additive SQL after a restore rehearsal against a backup copy; compare counts and entitlements before/after. Do not apply all pending unrelated migrations.
4. Approve live catalog/destination/domain/key setup and production bindings, with new checkouts paused. Deploy the migration-ready receiver and access logic; verify non-charging configuration/health checks.
5. Reconcile existing live subscriptions if any, and verify notification delivery/replay handling without test events granting real access.
6. Approve enabling new checkout separately. No agent-initiated real charge is part of validation.

## Rollback / recovery
- First pause new checkout; continue accepting verified live webhooks and processing live renewals/cancellations. Keep environment-specific signing secrets and the durable event inbox available.
- Do not blindly roll back to the pre-migration receiver after live subscriptions exist: it does not isolate environments or preserve reliable processing. Prepare a compatible rollback deployment before cutover; retain new additive tables and live entitlement logic, even if the UI is rolled back.
- Record a rollback watermark and reconcile all live subscriptions/events since cutover, including new subscriptions and changes during rollback. Replay notifications and fetch canonical state; retries alone do not guarantee recovery.
- Do NOT import the old full export over the active database. It can conflict with existing rows and would discard newer operational/billing changes. Restore into an empty isolated database, verify integrity/counts, then reconcile post-backup records/events before approving a database binding switch.
- Source recovery: extract the archive into a separate directory; compare changes before selectively restoring. It contains no production secrets and is not a deployed artifact.

## Official references consulted
- Paddle signature verification, authentication, webhook delivery documentation.
- Cloudflare D1 import/export documentation. SQL export/import is supported; restore verification here used SQLite only.