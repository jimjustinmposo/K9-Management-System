import { hashPassword, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

function sameSecret(supplied: string, configured: string): boolean {
  const left = new TextEncoder().encode(supplied)
  const right = new TextEncoder().encode(configured)
  let difference = left.length ^ right.length
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1)
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
  return difference === 0
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  if (!context.env.DEV_SECRET_PASS)
    return json({ error: "Password reset is not configured" }, 503)

  let body: { action?: unknown; secret?: unknown; email?: unknown; password?: unknown }
  try {
    body = (await context.request.json()) as typeof body
  } catch {
    return json({ error: "Invalid request" }, 400)
  }

  const secret = typeof body.secret === "string" ? body.secret : ""
  if (!sameSecret(secret, context.env.DEV_SECRET_PASS))
    return json({ error: "Developer secret password is incorrect" }, 403)
  if (body.action === "verify") return json({ success: true })

  const email = clean(body.email).toLowerCase()
  const password = typeof body.password === "string" ? body.password : ""
  if (!/^\S+@\S+\.\S+$/.test(email))
    return json({ error: "Enter a valid account email" }, 400)
  if (password.length < 6)
    return json({ error: "New password must be at least 6 characters" }, 400)

  const user = await context.env.DB.prepare("SELECT id FROM users WHERE email=?")
    .bind(email)
    .first<{ id: string }>()
  if (!user) return json({ error: "No account was found for that email" }, 404)

  const passwordData = await hashPassword(password)
  const now = new Date().toISOString()
  await context.env.DB.prepare(
    "UPDATE users SET password_hash=?,password_salt=?,updated_at=? WHERE id=?",
  )
    .bind(passwordData.hash, passwordData.salt, now, user.id)
    .run()
  await context.env.DB.prepare("DELETE FROM sessions WHERE user_id=?")
    .bind(user.id)
    .run()
  await context.env.DB.prepare("DELETE FROM password_resets WHERE user_id=?")
    .bind(user.id)
    .run()

  return json({ success: true })
}