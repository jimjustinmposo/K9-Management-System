import { hashToken, randomToken, type AppEnv } from "../../_lib/auth"
import { sendEmail } from "../../_lib/email"
import { appUrl, clean, id, json } from "../../_lib/http"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const body = (await context.request.json()) as { email?: unknown }
  const email = clean(body.email).toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email))
    return json({ error: "Enter a valid email address" }, 400)

  if (!context.env.RESEND_API_KEY || !context.env.RESEND_FROM_EMAIL) {
    console.error("Password reset email configuration is missing")
    return json(
      {
        error:
          "Password reset email is not configured. Please contact the administrator.",
      },
      503,
    )
  }

  const user = await context.env.DB.prepare(
    "SELECT id FROM users WHERE email=?",
  )
    .bind(email)
    .first<any>()
  if (user) {
    const token = randomToken()
    const tokenHash = await hashToken(token)
    const now = new Date()
    await context.env.DB.prepare(
      "DELETE FROM password_resets WHERE user_id=? OR expires_at<=?",
    )
      .bind(user.id, now.toISOString())
      .run()
    await context.env.DB.prepare(
      "INSERT INTO password_resets (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)",
    )
      .bind(
        id(),
        user.id,
        tokenHash,
        new Date(now.getTime() + 3600000).toISOString(),
        now.toISOString(),
      )
      .run()
    try {
      await sendEmail(
        context.env,
        email,
        "Reset your Martina's K9 System password",
        `<p>We received a request to reset your password.</p><p><a href="${appUrl(context.request, context.env.APP_URL)}/reset-password?token=${encodeURIComponent(token)}">Choose a new password</a></p><p>This secure link expires in one hour and can only be used once.</p><p>If you did not request this, you can ignore this email.</p>`,
      )
    } catch (error) {
      await context.env.DB.prepare("DELETE FROM password_resets WHERE token_hash=?")
        .bind(tokenHash)
        .run()
      console.error("Password reset email delivery failed", error)
      return json(
        { error: "Password reset email could not be sent. Please try again later." },
        503,
      )
    }
  }
  return json({
    success: true,
    message: "If that account exists, a reset link has been sent.",
  })
}
