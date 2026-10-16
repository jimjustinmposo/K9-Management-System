CREATE TABLE IF NOT EXISTS k9_shopping (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('food', 'others')),
  item TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  quantity REAL NOT NULL CHECK (quantity >= 0),
  price REAL NOT NULL CHECK (price >= 0),
  food_inventory_id TEXT REFERENCES k9_food_inventory(id) ON DELETE SET NULL,
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shopping_workspace_date ON k9_shopping(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_shopping_workspace_type ON k9_shopping(workspace_id, type);