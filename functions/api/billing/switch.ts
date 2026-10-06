import {
  isResponse,
  requireSession,
  verifyPassword,
  type AppEnv,
} from "../../_lib/auth"
import { json } from "../../_lib/http"
import { stripe, stripePrice } from "../../_lib/stripe"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageBilling")
  if (isResponse(session)) return session
  try {
    const body = (await context.request.json()) as any
    const interval = body.interval === "year" ? "year" : "month"
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
      "SELECT * FROM workspaces WHERE id=?",
    )
      .bind(session.workspace.id)
      .first<any>()
    if (!workspace?.stripe_subscription_id || !workspace.stripe_base_item_id)
      return json({ error: "No subscription to change" }, 400)
    const params = new URLSearchParams({
      "items[0][id]": workspace.stripe_base_item_id,
      "items[0][price]": stripePrice(context.env, interval),
      proration_behavior: "always_invoice",
      "metadata[workspace_id]": session.workspace.id,
    })
    if (workspace.stripe_seat_item_id) {
      params.set("items[1][id]", workspace.stripe_seat_item_id)
      params.set("items[1][price]", stripePrice(context.env, interval, true))
    }
    await stripe(
      context.env,
      `subscriptions/${workspace.stripe_subscription_id}`,
      { method: "POST", body: params },
    )
    await context.env.DB.prepare(
      "UPDATE workspaces SET billing_interval=?,updated_at=? WHERE id=?",
    )
      .bind(interval, new Date().toISOString(), session.workspace.id)
      .run()
    return json({ success: true })
  } catch (error) {
    return json(
      { error: "Unable to change billing interval", detail: String(error) },
      500,
    )
  }
}
