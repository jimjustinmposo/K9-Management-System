import {
  hashToken,
  isResponse,
  randomToken,
  requireSession,
  type AppEnv,
} from "../../_lib/auth"
import { sendEmail } from "../../_lib/email"
import { appUrl, clean, id, json } from "../../_lib/http"

async function seatCount(db: D1Database, workspaceId: string): Promise<number> {
  const members = await db
    .prepare(
      "SELECT COUNT(*) count FROM memberships WHERE workspace_id=? AND role='member'",
    )
    .bind(workspaceId)
    .first<any>()
  const pending = await db
    .prepare(
      "SELECT COUNT(*) count FROM invitations WHERE workspace_id=? AND status='pending' AND expires_at>?",
    )
    .bind(workspaceId, new Date().toISOString())
    .first<any>()
  return Number(members?.count ?? 0) + Number(pending?.count ?? 0)
}

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "viewAdmin")
  if (isResponse(session)) return session
  const [members, invites] = await Promise.all([
    context.env.DB.prepare(
      "SELECT u.id,u.name,u.email,m.role,m.created_at FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=? ORDER BY m.created_at",
    )
      .bind(session.workspace.id)
      .all(),
    context.env.DB.prepare(
      "SELECT id,email,status,expires_at,created_at FROM invitations WHERE workspace_id=? AND status='pending' ORDER BY created_at DESC",
    )
      .bind(session.workspace.id)
      .all(),
  ])
  const used = await seatCount(context.env.DB, session.workspace.id)
  return json({
    data: {
      members: members.results,
      invitations: invites.results,
      seats: { included: 3, used, extra: 0 },
    },
  })
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageMembers")
  if (isResponse(session)) return session
  try {
    const email = clean(
      ((await context.request.json()) as any).email,
    ).toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email))
      return json({ error: "A valid email is required" }, 400)
    if (
      await context.env.DB.prepare("SELECT id FROM users WHERE email=?")
        .bind(email)
        .first()
    )
      return json({ error: "This email already belongs to an account" }, 409)
    await context.env.DB.prepare(
      "DELETE FROM invitations WHERE workspace_id=? AND email=? AND (status!='pending' OR expires_at<=?)",
    )
      .bind(session.workspace.id, email, new Date().toISOString())
      .run()
    if (
      await context.env.DB.prepare(
        "SELECT id FROM invitations WHERE workspace_id=? AND email=? AND status='pending'",
      )
        .bind(session.workspace.id, email)
        .first()
    )
      return json({ error: "An invitation is already pending" }, 409)
    const nextCount =
      (await seatCount(context.env.DB, session.workspace.id)) + 1
    if (nextCount > 3)
      return json({ error: "Your plan includes 3 member accounts" }, 409)
    const token = randomToken()
    const now = new Date()
    const inviteId = id()
    await context.env.DB.prepare(
      "INSERT INTO invitations (id,workspace_id,email,token_hash,status,expires_at,created_at) VALUES (?,?,?,?,?,?,?)",
    )
      .bind(
        inviteId,
        session.workspace.id,
        email,
        await hashToken(token),
        "pending",
        new Date(now.getTime() + 7 * 86400000).toISOString(),
        now.toISOString(),
      )
      .run()
    try {
      await sendEmail(
        context.env,
        email,
        `Join ${session.workspace.name} on Sentinel`,
        `<p>${session.user.name} invited you to ${session.workspace.name}.</p><p><a href="${appUrl(context.request, context.env.APP_URL)}/accept-invite?token=${encodeURIComponent(token)}">Accept invitation</a></p><p>This invitation expires in 7 days.</p>`,
      )
    } catch (error) {
      await context.env.DB.prepare("DELETE FROM invitations WHERE id=?")
        .bind(inviteId)
        .run()
      throw error
    }
    return json({ success: true }, 201)
  } catch (error) {
    return json(
      { error: "Unable to invite member", detail: String(error) },
      500,
    )
  }
}
