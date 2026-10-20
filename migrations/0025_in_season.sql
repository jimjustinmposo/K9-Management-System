CREATE TABLE IF NOT EXISTS k9_seasons (
  id TEXT PRIMARY KEY,
  k9_id TEXT NOT NULL REFERENCES k9_roster(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Ended')),
  notes TEXT NOT NULL DEFAULT '',
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_seasons_workspace_status ON k9_seasons(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_seasons_workspace_k9 ON k9_seasons(workspace_id, k9_id);
CREATE INDEX IF NOT EXISTS idx_seasons_workspace_start ON k9_seasons(workspace_id, start_date);