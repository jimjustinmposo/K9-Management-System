export const MEMBER_LIMIT = 5

export async function seatCount(db: D1Database, workspaceId: string): Promise<number> {
  const members = await db.prepare(
    "SELECT COUNT(*) count FROM memberships WHERE workspace_id=? AND role='member' AND archived_at IS NULL",
  ).bind(workspaceId).first<{ count: number }>()
  const pending = await db.prepare(
    "SELECT COUNT(*) count FROM invitations WHERE workspace_id=? AND status='pending' AND expires_at>?",
  ).bind(workspaceId, new Date().toISOString()).first<{ count: number }>()
  return Number(members?.count ?? 0) + Number(pending?.count ?? 0)
}