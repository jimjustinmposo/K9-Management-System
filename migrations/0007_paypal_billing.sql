ALTER TABLE workspaces ADD COLUMN paypal_payer_id TEXT;
ALTER TABLE workspaces ADD COLUMN paypal_subscription_id TEXT;
ALTER TABLE workspaces ADD COLUMN paypal_plan_id TEXT;
ALTER TABLE workspaces ADD COLUMN paypal_last_event_time TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_paypal_subscription
  ON workspaces(paypal_subscription_id)
  WHERE paypal_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  processed_at TEXT NOT NULL,
  created_at TEXT,
  error TEXT
);

DROP TABLE IF EXISTS stripe_events;
