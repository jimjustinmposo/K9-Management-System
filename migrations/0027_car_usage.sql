CREATE TABLE IF NOT EXISTS k9_car_usage (
  id TEXT PRIMARY KEY,
  k9_id TEXT NOT NULL REFERENCES k9_roster(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  driver TEXT NOT NULL,
  time_in TEXT NOT NULL,
  km_start REAL NOT NULL CHECK (km_start >= 0),
  time_out TEXT NOT NULL,
  km_end REAL NOT NULL CHECK (km_end >= km_start),
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_car_usage_workspace_date ON k9_car_usage(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_car_usage_workspace_k9 ON k9_car_usage(workspace_id, k9_id);