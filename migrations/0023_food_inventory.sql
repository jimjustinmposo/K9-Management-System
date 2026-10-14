CREATE TABLE IF NOT EXISTS k9_food_inventory (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  item TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL CHECK (amount >= 0),
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_foodinv_workspace_date
  ON k9_food_inventory(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_foodinv_workspace_item
  ON k9_food_inventory(workspace_id, item);