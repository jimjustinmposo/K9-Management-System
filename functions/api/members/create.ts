import {
  hashPassword,
  isResponse,
  requireSession,
  type AppEnv,
} from "../../_lib/auth"
import { clean, id, json } from "../../_lib/http"

async function seatCount(db: D1Database, workspaceId: string): Promise<number> {
  const members = await db
    .prepare(
      "SELECT COUNT(*) count FROM memberships WHERE workspace_id=? AND role='member' AND archived_at IS NULL",
    )
    .bind(workspaceId)
    .first<{ count: number }>()
  const pending = await db
    .prepare(
      "SELECT COUNT(*) count FROM invitations WHERE workspace_id=? AND status='pending' AND expires_at>?",
    )
    .bind(workspaceId, new Date().toISOString())
    .first<{ count: number }>()
  return Number(members?.count ?? 0) + Number(pending?.count ?? 0)
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageMembers")
  if (isResponse(session)) return session

  try {
    const body = (await context.request.json()) as Record<string, unknown>
    const name = clean(body.name)
    const email = clean(body.email).toLowerCase()
    const password = typeof body.password === "string" ? body.password : ""
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : ""

    if (!name || !/^\S+@\S+\.\S+$/.test(email))
      return json({ error: "A name and valid email are required" }, 400)
    if (password.length < 6)
      return json({ error: "Password must be at least 6 characters" }, 400)
    if (password !== confirmPassword)
      return json({ error: "Passwords do not match" }, 400)
    if (
      await context.env.DB.prepare("SELECT id FROM users WHERE email=?")
        .bind(email)
        .first()
    )
      return json({ error: "This email already belongs to an account" }, 409)
    if ((await seatCount(context.env.DB, session.workspace.id)) >= 3)
      return json({ error: "Your plan includes 3 member accounts" }, 409)

    const now = new Date().toISOString()
    const userId = id()
    const passwordData = await hashPassword(password)
    await context.env.DB.prepare(
      "INSERT INTO users (id,email,name,password_hash,password_salt,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
    )
      .bind(
        userId,
        email,
        name,
        passwordData.hash,
        passwordData.salt,
        now,
        now,
      )
      .run()
    try {
      await context.env.DB.prepare(
        "INSERT INTO memberships (id,workspace_id,user_id,role,created_at) VALUES (?,?,?,?,?)",
      )
        .bind(id(), session.workspace.id, userId, "member", now)
        .run()
    } catch (error) {
      await context.env.DB.prepare("DELETE FROM users WHERE id=?")
        .bind(userId)
        .run()
      throw error
    }

    return json(
      { success: true, data: { id: userId, name, email, role: "member" } },
      201,
    )
  } catch {
    return json({ error: "Unable to create member account" }, 500)
  }
}