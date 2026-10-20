CREATE TABLE IF NOT EXISTS k9_grooming (
  id TEXT PRIMARY KEY,
  k9_id TEXT NOT NULL REFERENCES k9_roster(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  bathing INTEGER NOT NULL DEFAULT 0 CHECK (bathing IN (0, 1)),
  nails INTEGER NOT NULL DEFAULT 0 CHECK (nails IN (0, 1)),
  ears TEXT NOT NULL DEFAULT '',
  brushing INTEGER NOT NULL DEFAULT 0 CHECK (brushing IN (0, 1)),
  price REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_grooming_workspace_date ON k9_grooming(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_grooming_workspace_k9 ON k9_grooming(workspace_id, k9_id);