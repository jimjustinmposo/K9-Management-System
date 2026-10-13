CREATE TABLE IF NOT EXISTS k9_training_obedience (
  id TEXT PRIMARY KEY,
  k9_id TEXT NOT NULL REFERENCES k9_roster(id) ON DELETE CASCADE,
  handler_id TEXT NOT NULL REFERENCES k9_handlers(id) ON DELETE RESTRICT,
  session_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_training_obedience_workspace_date ON k9_training_obedience(workspace_id, session_date);
CREATE INDEX IF NOT EXISTS idx_training_obedience_workspace_k9 ON k9_training_obedience(workspace_id, k9_id);
CREATE INDEX IF NOT EXISTS idx_training_obedience_workspace_handler ON k9_training_obedience(workspace_id, handler_id);

CREATE TABLE IF NOT EXISTS k9_training_detection (
  id TEXT PRIMARY KEY,
  k9_id TEXT NOT NULL REFERENCES k9_roster(id) ON DELETE CASCADE,
  handler_id TEXT NOT NULL REFERENCES k9_handlers(id) ON DELETE RESTRICT,
  session_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_training_detection_workspace_date ON k9_training_detection(workspace_id, session_date);
CREATE INDEX IF NOT EXISTS idx_training_detection_workspace_k9 ON k9_training_detection(workspace_id, k9_id);
CREATE INDEX IF NOT EXISTS idx_training_detection_workspace_handler ON k9_training_detection(workspace_id, handler_id);

CREATE TABLE IF NOT EXISTS k9_training_tracking (
  id TEXT PRIMARY KEY,
  k9_id TEXT NOT NULL REFERENCES k9_roster(id) ON DELETE CASCADE,
  handler_id TEXT NOT NULL REFERENCES k9_handlers(id) ON DELETE RESTRICT,
  session_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_training_tracking_workspace_date ON k9_training_tracking(workspace_id, session_date);
CREATE INDEX IF NOT EXISTS idx_training_tracking_workspace_k9 ON k9_training_tracking(workspace_id, k9_id);
CREATE INDEX IF NOT EXISTS idx_training_tracking_workspace_handler ON k9_training_tracking(workspace_id, handler_id);

CREATE TABLE IF NOT EXISTS k9_training_protection (
  id TEXT PRIMARY KEY,
  k9_id TEXT NOT NULL REFERENCES k9_roster(id) ON DELETE CASCADE,
  handler_id TEXT NOT NULL REFERENCES k9_handlers(id) ON DELETE RESTRICT,
  session_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_training_protection_workspace_date ON k9_training_protection(workspace_id, session_date);
CREATE INDEX IF NOT EXISTS idx_training_protection_workspace_k9 ON k9_training_protection(workspace_id, k9_id);
CREATE INDEX IF NOT EXISTS idx_training_protection_workspace_handler ON k9_training_protection(workspace_id, handler_id);

CREATE TABLE IF NOT EXISTS k9_training_socialization (
  id TEXT PRIMARY KEY,
  k9_id TEXT NOT NULL REFERENCES k9_roster(id) ON DELETE CASCADE,
  handler_id TEXT NOT NULL REFERENCES k9_handlers(id) ON DELETE RESTRICT,
  session_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_training_socialization_workspace_date ON k9_training_socialization(workspace_id, session_date);
CREATE INDEX IF NOT EXISTS idx_training_socialization_workspace_k9 ON k9_training_socialization(workspace_id, k9_id);
CREATE INDEX IF NOT EXISTS idx_training_socialization_workspace_handler ON k9_training_socialization(workspace_id, handler_id);