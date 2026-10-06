import { hashToken, randomToken, type AppEnv } from "../../_lib/auth"
import { sendEmail } from "../../_lib/email"
import { appUrl, clean, id, json } from "../../_lib/http"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const email = clean(
    ((await context.request.json()) as any).email,
  ).toLowerCase()
  const user = await context.env.DB.prepare(
    "SELECT id FROM users WHERE email=?",
  )
    .bind(email)
    .first<any>()
  if (user) {
    const token = randomToken()
    const now = new Date()
    await context.env.DB.prepare(
      "INSERT INTO password_resets (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)",
    )
      .bind(
        id(),
        user.id,
        await hashToken(token),
        new Date(now.getTime() + 3600000).toISOString(),
        now.toISOString(),
      )
      .run()
    try {
      await sendEmail(
        context.env,
        email,
        "Reset your Sentinel password",
        `<p>Reset your password:</p><p><a href="${appUrl(context.request, context.env.APP_URL)}/reset-password?token=${encodeURIComponent(token)}">Reset password</a></p><p>This link expires in one hour.</p>`,
      )
    } catch {
      /* Do not reveal delivery state. */
    }
  }
  return json({
    success: true,
    message: "If that account exists, a reset link has been sent.",
  })
}
