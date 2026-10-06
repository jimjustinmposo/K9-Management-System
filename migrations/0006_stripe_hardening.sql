ALTER TABLE workspaces ADD COLUMN stripe_last_event_created INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stripe_events ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE stripe_events ADD COLUMN created_at TEXT;
ALTER TABLE stripe_events ADD COLUMN error TEXT;
