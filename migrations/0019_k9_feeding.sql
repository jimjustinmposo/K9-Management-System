CREATE TABLE IF NOT EXISTS k9feeding (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  dog TEXT NOT NULL REFERENCES k9_roster(id) ON DELETE CASCADE,
  handler TEXT NOT NULL REFERENCES k9_handlers(id) ON DELETE RESTRICT,
  food TEXT NOT NULL,
  grams REAL NOT NULL CHECK (grams >= 0),
  noted TEXT NOT NULL DEFAULT '',
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_k9feeding_workspace_date ON k9feeding(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_k9feeding_workspace_dog ON k9feeding(workspace_id, dog);
CREATE INDEX IF NOT EXISTS idx_k9feeding_workspace_handler ON k9feeding(workspace_id, handler);