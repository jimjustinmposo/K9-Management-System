import {
  hashPassword,
  isResponse,
  requireSession,
  type AppEnv,
} from "../../_lib/auth"
import { json } from "../../_lib/http"

export const onRequestPatch: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageMembers")
  if (isResponse(session)) return session
  const target = context.params.id as string
  const body = (await context.request.json()) as { password?: unknown }
  const password = typeof body.password === "string" ? body.password : ""
  if (password.length < 6)
    return json({ error: "Password must be at least 6 characters" }, 400)

  const member = await context.env.DB.prepare(
    "SELECT u.id FROM memberships m JOIN users u ON u.id=m.user_id WHERE u.id=? AND m.workspace_id=? AND m.role='member'",
  )
    .bind(target, session.workspace.id)
    .first<any>()
  if (!member) return json({ error: "Member not found" }, 404)

  const passwordData = await hashPassword(password)
  const now = new Date().toISOString()
  await context.env.DB.prepare(
    "UPDATE users SET password_hash=?,password_salt=?,updated_at=? WHERE id=?",
  )
    .bind(passwordData.hash, passwordData.salt, now, target)
    .run()
  await context.env.DB.prepare("DELETE FROM sessions WHERE user_id=?")
    .bind(target)
    .run()
  await context.env.DB.prepare("DELETE FROM password_resets WHERE user_id=?")
    .bind(target)
    .run()
  return json({ success: true })
}

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
