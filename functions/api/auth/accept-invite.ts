import {
  createSession,
  hashPassword,
  hashToken,
  type AppEnv,
} from "../../_lib/auth"
import { clean, id, json } from "../../_lib/http"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const body = (await context.request.json()) as any
  const token = clean(body.token)
  const name = clean(body.name)
  const password = String(body.password ?? "")
  if (!token || !name || password.length < 6)
    return json(
      { error: "Name and a password of at least 6 characters are required" },
      400,
    )
  const invite = await context.env.DB.prepare(
    "SELECT * FROM invitations WHERE token_hash=? AND status='pending' AND expires_at>?",
  )
    .bind(await hashToken(token), new Date().toISOString())
    .first<any>()
  if (!invite)
    return json({ error: "This invitation is invalid or expired" }, 400)
  if (
    await context.env.DB.prepare("SELECT id FROM users WHERE email=?")
      .bind(invite.email)
      .first()
  )
    return json({ error: "This email already belongs to an account" }, 409)
  const userId = id()
  const now = new Date().toISOString()
  const data = await hashPassword(password)
  await context.env.DB.prepare(
    "INSERT INTO users (id,email,name,password_hash,password_salt,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
  )
    .bind(userId, invite.email, name, data.hash, data.salt, now, now)
    .run()
  await context.env.DB.prepare(
    "INSERT INTO memberships (id,workspace_id,user_id,role,created_at) VALUES (?,?,?,?,?)",
  )
    .bind(id(), invite.workspace_id, userId, "member", now)
    .run()
  await context.env.DB.prepare(
    "UPDATE invitations SET status='accepted',accepted_at=? WHERE id=?",
  )
    .bind(now, invite.id)
    .run()
  return json({ success: true }, 200, {
    "Set-Cookie": await createSession(context.env.DB, userId),
  })
}
