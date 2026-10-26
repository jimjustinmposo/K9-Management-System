-- Additive only. No legacy rows or entitlements are changed by this migration.
CREATE TABLE billing_checkout_attempts (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  price_id TEXT NOT NULL,
  transaction_id TEXT,
  state TEXT NOT NULL CHECK(state IN ('creating','ready','completed','review')),
  created_at TEXT NOT NULL,
  UNIQUE(environment, transaction_id),
  UNIQUE(environment, id)
);
CREATE UNIQUE INDEX billing_one_open_checkout ON billing_checkout_attempts(environment,workspace_id)
  WHERE state IN ('creating','ready','review');
CREATE TABLE billing_subscriptions (
  environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
  subscription_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  customer_id TEXT NOT NULL,
  price_id TEXT NOT NULL,
  billing_interval TEXT NOT NULL CHECK(billing_interval IN ('month','year')),
  status TEXT NOT NULL CHECK(status IN ('active','trialing','past_due','paused','canceled')),
  period_end TEXT,
  scheduled_action TEXT,
  scheduled_at TEXT,
  version TEXT NOT NULL,
  PRIMARY KEY(environment,subscription_id)
);
CREATE INDEX billing_workspace_subscriptions ON billing_subscriptions(environment,workspace_id,status);
CREATE TABLE billing_event_receipts (
  environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY(environment,event_id)
);
CREATE TABLE billing_legacy_grants (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),
  expires_at TEXT NOT NULL,
  captured_at TEXT NOT NULL
);
CREATE TABLE billing_cutover (
  id INTEGER PRIMARY KEY CHECK(id=1),
  captured_at TEXT NOT NULL
);