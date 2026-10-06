import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { appUrl, json } from "../../_lib/http"
import { paypal, paypalPlan } from "../../_lib/paypal"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageBilling")
  if (isResponse(session)) return session
  try {
    const body = (await context.request.json()) as { interval?: string }
    const interval = body.interval === "year" ? "year" : "month"
    const workspace = await context.env.DB.prepare(
      "SELECT paypal_subscription_id,subscription_status FROM workspaces WHERE id=?",
    )
      .bind(session.workspace.id)
      .first<any>()
    if (
      workspace?.paypal_subscription_id &&
      workspace.subscription_status === "active"
    )
      return json({ error: "This workspace already has a subscription" }, 409)

    const base = appUrl(context.request, context.env.APP_URL)
    const subscription = await paypal(context.env, "/v1/billing/subscriptions", {
      method: "POST",
      headers: { "PayPal-Request-Id": crypto.randomUUID() },
      body: {
        plan_id: paypalPlan(context.env, interval),
        custom_id: `${session.workspace.id}:${interval}`,
        subscriber: { email_address: session.user.email },
        application_context: {
          brand_name: "Sentinel K9 Operations",
          user_action: "SUBSCRIBE_NOW",
          shipping_preference: "NO_SHIPPING",
          return_url: `${base}/billing/success`,
          cancel_url: `${base}/subscription?checkout=cancelled`,
        },
      },
    })
    const approvalUrl = subscription.links?.find(
      (link: any) => link.rel === "approve",
    )?.href
    if (!approvalUrl) throw new Error("PayPal approval URL was not returned")
    await context.env.DB.prepare(
      "UPDATE workspaces SET paypal_subscription_id=?,paypal_plan_id=?,billing_interval=?,subscription_status='approval_pending',updated_at=? WHERE id=?",
    )
      .bind(
        subscription.id,
        paypalPlan(context.env, interval),
        interval,
        new Date().toISOString(),
        session.workspace.id,
      )
      .run()
    return json({ data: { url: approvalUrl } })
  } catch (error) {
    return json(
      { error: "Unable to start PayPal checkout", detail: String(error) },
      500,
    )
  }
}
