CREATE INDEX IF NOT EXISTS idx_memberships_workspace_role
  ON memberships(workspace_id, role);