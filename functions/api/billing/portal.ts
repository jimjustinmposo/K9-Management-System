import {
  isResponse,
  requireSession,
  verifyPassword,
  type AppEnv,
} from "../../_lib/auth"
import { appUrl, json } from "../../_lib/http"
import { stripe } from "../../_lib/stripe"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageBilling")
  if (isResponse(session)) return session
  const body = (await context.request.json()) as any
  const user = await context.env.DB.prepare(
    "SELECT password_hash,password_salt FROM users WHERE id=?",
  )
    .bind(session.user.id)
    .first<any>()
  if (
    !user ||
    !(await verifyPassword(
      String(body.currentPassword ?? ""),
      user.password_salt,
      user.password_hash,
    ))
  )
    return json({ error: "Current password is incorrect" }, 403)
  const workspace = await context.env.DB.prepare(
    "SELECT stripe_customer_id FROM workspaces WHERE id=?",
  )
    .bind(session.workspace.id)
    .first<any>()
  if (!workspace?.stripe_customer_id)
    return json({ error: "No billing account exists yet" }, 400)
  try {
    const portal = await stripe(context.env, "billing_portal/sessions", {
      method: "POST",
      body: new URLSearchParams({
        customer: workspace.stripe_customer_id,
        return_url: `${appUrl(context.request, context.env.APP_URL)}/subscription`,
      }),
    })
    return json({ data: { url: portal.url } })
  } catch (error) {
    return json(
      { error: "Unable to open billing portal", detail: String(error) },
      500,
    )
  }
}
