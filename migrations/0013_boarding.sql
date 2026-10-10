CREATE TABLE IF NOT EXISTS boarding_records (
  id TEXT PRIMARY KEY,
  k9_id TEXT NOT NULL,
  owner_name TEXT NOT NULL DEFAULT '',
  owner_phone TEXT NOT NULL DEFAULT '',
  check_in_date TEXT NOT NULL,
  check_out_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Boarding' CHECK (status IN ('Boarding', 'Checked Out')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_boarding_workspace_status
  ON boarding_records(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_boarding_workspace_k9
  ON boarding_records(workspace_id, k9_id);
CREATE INDEX IF NOT EXISTS idx_boarding_check_in
  ON boarding_records(workspace_id, check_in_date);