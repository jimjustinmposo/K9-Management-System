-- RUN ONLY AFTER explicit production approval and a fresh verified backup.
-- Fail rather than silently remove access from active workspaces with missing/invalid dates.
CREATE TABLE billing_cutover_guard (valid INTEGER CHECK(valid=1));
INSERT INTO billing_cutover_guard SELECT CASE WHEN EXISTS (
  SELECT 1 FROM workspaces WHERE lower(subscription_status)='active'
    AND (current_period_end IS NULL OR julianday(current_period_end) IS NULL)
) THEN 0 ELSE 1 END;
INSERT INTO billing_legacy_grants(workspace_id,expires_at,captured_at)
SELECT id,current_period_end,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM workspaces
WHERE lower(subscription_status)='active' AND julianday(current_period_end)>julianday('now')
  AND NOT EXISTS(SELECT 1 FROM billing_cutover WHERE id=1)
ON CONFLICT(workspace_id) DO NOTHING;
INSERT INTO billing_cutover(id,captured_at) VALUES(1,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
ON CONFLICT(id) DO NOTHING;
DROP TABLE billing_cutover_guard;