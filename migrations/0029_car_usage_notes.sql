-- Preserve existing trip data and legacy K9 links; new trips do not require a K9.
CREATE TABLE k9_car_usage_with_notes (
  id TEXT PRIMARY KEY,
  k9_id TEXT REFERENCES k9_roster(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  driver TEXT NOT NULL,
  time_in TEXT NOT NULL,
  km_start REAL NOT NULL CHECK (km_start >= 0),
  time_out TEXT NOT NULL,
  km_end REAL NOT NULL CHECK (km_end >= km_start),
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  km_used REAL NOT NULL DEFAULT 0 CHECK (km_used >= 0),
  notes TEXT NOT NULL DEFAULT ''
);
INSERT INTO k9_car_usage_with_notes
  (id,k9_id,date,driver,time_in,km_start,time_out,km_end,workspace_id,created_by_user_id,created_at,updated_at,km_used)
SELECT id,k9_id,date,driver,time_in,km_start,time_out,km_end,workspace_id,created_by_user_id,created_at,updated_at,km_used
FROM k9_car_usage;
DROP TABLE k9_car_usage;
ALTER TABLE k9_car_usage_with_notes RENAME TO k9_car_usage;
CREATE INDEX idx_car_usage_workspace_date ON k9_car_usage(workspace_id, date);
CREATE INDEX idx_car_usage_workspace_k9 ON k9_car_usage(workspace_id, k9_id);