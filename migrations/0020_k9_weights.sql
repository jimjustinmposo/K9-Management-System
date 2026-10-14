CREATE TABLE IF NOT EXISTS k9weights (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  dog_id TEXT NOT NULL REFERENCES k9_roster(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT '',
  weight REAL NOT NULL CHECK (weight > 0),
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_k9weights_workspace_date ON k9weights(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_k9weights_workspace_dog ON k9weights(workspace_id, dog_id);