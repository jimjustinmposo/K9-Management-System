ALTER TABLE memberships ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_memberships_workspace_active_role
  ON memberships(workspace_id, role, archived_at);