import { hashPassword, hashToken, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const body = (await context.request.json()) as {
    token?: unknown
    password?: unknown
  }
  const token = clean(body.token)
  const password = typeof body.password === "string" ? body.password : ""
  if (!token || password.length < 6)
    return json(
      {
        error:
          "A valid token and password of at least 6 characters are required",
      },
      400,
    )
  const reset = await context.env.DB.prepare(
    "SELECT id,user_id FROM password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at>?",
  )
    .bind(await hashToken(token), new Date().toISOString())
    .first<any>()
  if (!reset)
    return json({ error: "This reset link is invalid or expired" }, 400)
  const data = await hashPassword(password)
  const now = new Date().toISOString()
  await context.env.DB.prepare(
    "UPDATE users SET password_hash=?,password_salt=?,updated_at=? WHERE id=?",
  )
    .bind(data.hash, data.salt, now, reset.user_id)
    .run()
  await context.env.DB.prepare(
    "UPDATE password_resets SET used_at=? WHERE id=?",
  )
    .bind(now, reset.id)
    .run()
  await context.env.DB.prepare("DELETE FROM sessions WHERE user_id=?")
    .bind(reset.user_id)
    .run()
  await context.env.DB.prepare(
    "DELETE FROM password_resets WHERE user_id=? AND id<>?",
  )
    .bind(reset.user_id, reset.id)
    .run()
  return json({ success: true })
}
