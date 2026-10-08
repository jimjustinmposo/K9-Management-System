ALTER TABLE workspaces ADD COLUMN paddle_customer_id TEXT;
ALTER TABLE workspaces ADD COLUMN paddle_subscription_id TEXT;
ALTER TABLE workspaces ADD COLUMN paddle_price_id TEXT;
ALTER TABLE workspaces ADD COLUMN paddle_plan TEXT;
ALTER TABLE workspaces ADD COLUMN paddle_current_period_start TEXT;
ALTER TABLE workspaces ADD COLUMN paddle_scheduled_cancel_at TEXT;
ALTER TABLE workspaces ADD COLUMN paddle_last_synced_at TEXT;
ALTER TABLE workspaces ADD COLUMN paddle_last_event_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_paddle_customer
  ON workspaces(paddle_customer_id)
  WHERE paddle_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_paddle_subscription
  ON workspaces(paddle_subscription_id)
  WHERE paddle_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS paddle_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  received_at TEXT NOT NULL,
  processed_at TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_paddle_webhook_events_status
  ON paddle_webhook_events(status, received_at);