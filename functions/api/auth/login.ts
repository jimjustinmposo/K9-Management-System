import { createSession, verifyPassword, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const body = (await context.request.json()) as any
  const email = clean(body.email).toLowerCase()
  const row = await context.env.DB.prepare(
    "SELECT id,password_hash,password_salt FROM users WHERE email=?",
  )
    .bind(email)
    .first<any>()
  if (
    !row ||
    !(await verifyPassword(
      String(body.password ?? ""),
      row.password_salt,
      row.password_hash,
    ))
  )
    return json({ error: "Invalid email or password" }, 401)
  return json({ success: true }, 200, {
    "Set-Cookie": await createSession(context.env.DB, row.id),
  })
}
