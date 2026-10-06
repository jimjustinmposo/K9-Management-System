import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"

export const onRequestDelete: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageMembers")
  if (isResponse(session)) return session
  const target = context.params.id as string
  const invite = await context.env.DB.prepare(
    "SELECT id FROM invitations WHERE id=? AND workspace_id=? AND status='pending'",
  )
    .bind(target, session.workspace.id)
    .first()
  if (invite)
    await context.env.DB.prepare(
      "UPDATE invitations SET status='revoked' WHERE id=?",
    )
      .bind(target)
      .run()
  else {
    const member = await context.env.DB.prepare(
      "SELECT m.id,u.email FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.user_id=? AND m.workspace_id=? AND m.role='member'",
    )
      .bind(target, session.workspace.id)
      .first<any>()
    if (!member) return json({ error: "Member or invitation not found" }, 404)
    await context.env.DB.prepare("DELETE FROM memberships WHERE id=?")
      .bind(member.id)
      .run()
    await context.env.DB.prepare("DELETE FROM sessions WHERE user_id=?")
      .bind(target)
      .run()
    await context.env.DB.prepare("DELETE FROM users WHERE id=?")
      .bind(target)
      .run()
    await context.env.DB.prepare(
      "DELETE FROM invitations WHERE workspace_id=? AND email=?",
    )
      .bind(session.workspace.id, member.email)
      .run()
  }
  return json({ success: true })
}
