CREATE TABLE IF NOT EXISTS k9_handlers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  nick_name TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_k9_handlers_workspace_name
  ON k9_handlers(workspace_id, full_name);