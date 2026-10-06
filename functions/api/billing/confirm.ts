import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"
import { paypal } from "../../_lib/paypal"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageBilling")
  if (isResponse(session)) return session
  try {
    const body = (await context.request.json()) as { subscriptionId?: string }
    const stored = await context.env.DB.prepare(
      "SELECT paypal_subscription_id FROM workspaces WHERE id=?",
    )
      .bind(session.workspace.id)
      .first<any>()
    const subscriptionId = String(
      body.subscriptionId || stored?.paypal_subscription_id || "",
    )
    if (!subscriptionId.startsWith("I-"))
      return json({ error: "Invalid PayPal subscription" }, 400)
    const subscription = await paypal(
      context.env,
      `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    )
    const [workspaceId, interval = "month"] = String(
      subscription.custom_id || "",
    ).split(":")
    if (workspaceId !== session.workspace.id)
      return json({ error: "This subscription belongs to another workspace" }, 403)
    if (subscription.status !== "ACTIVE")
      return json({ error: `PayPal subscription is ${subscription.status}` }, 409)
    const renewal = subscription.billing_info?.next_billing_time || null
    await context.env.DB.prepare(
      "UPDATE workspaces SET paypal_payer_id=?,paypal_subscription_id=?,paypal_plan_id=?,billing_interval=?,subscription_status='active',current_period_end=?,updated_at=? WHERE id=?",
    )
      .bind(
        subscription.subscriber?.payer_id || null,
        subscription.id,
        subscription.plan_id,
        interval,
        renewal,
        new Date().toISOString(),
        workspaceId,
      )
      .run()
    await context.env.DB.prepare(
      "UPDATE k9_roster SET workspace_id=? WHERE workspace_id IS NULL",
    )
      .bind(workspaceId)
      .run()
    return json({ data: { active: true, currentPeriodEnd: renewal } })
  } catch (error) {
    return json(
      { error: "Unable to verify PayPal subscription", detail: String(error) },
      500,
    )
  }
}
