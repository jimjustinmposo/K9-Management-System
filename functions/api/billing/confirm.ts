import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"
import { stripe } from "../../_lib/stripe"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageBilling")
  if (isResponse(session)) return session

  try {
    const body = (await context.request.json()) as { sessionId?: string }
    const sessionId = String(body.sessionId || "")
    if (!sessionId.startsWith("cs_"))
      return json({ error: "Invalid Checkout Session" }, 400)

    const checkout = await stripe(
      context.env,
      `checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`,
    )
    const [workspaceId, referenceInterval] = String(
      checkout.client_reference_id || "",
    ).split(":")
    if (workspaceId !== session.workspace.id)
      return json({ error: "This payment does not belong to your workspace" }, 403)
    if (checkout.status !== "complete")
      return json({ error: "Checkout is not complete" }, 409)

    const subscription = checkout.subscription
    if (!subscription || typeof subscription === "string")
      return json({ error: "Stripe subscription details are unavailable" }, 409)
    if (!["active", "trialing"].includes(subscription.status))
      return json({ error: `Subscription is ${subscription.status}` }, 409)

    const items = subscription.items?.data ?? []
    const baseItem = items[0]
    const currentPeriodEnd =
      subscription.current_period_end || baseItem?.current_period_end
    const periodEnd = currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000).toISOString()
      : null
    const interval =
      referenceInterval || baseItem?.price?.recurring?.interval || "month"

    await context.env.DB.prepare(
      `UPDATE workspaces SET stripe_customer_id=?,stripe_subscription_id=?,stripe_base_item_id=?,billing_interval=?,subscription_status=?,current_period_end=?,updated_at=? WHERE id=?`,
    )
      .bind(
        typeof checkout.customer === "string"
          ? checkout.customer
          : checkout.customer?.id,
        subscription.id,
        baseItem?.id || null,
        interval,
        subscription.status,
        periodEnd,
        new Date().toISOString(),
        workspaceId,
      )
      .run()
    await context.env.DB.prepare(
      "UPDATE k9_roster SET workspace_id=? WHERE workspace_id IS NULL",
    )
      .bind(workspaceId)
      .run()

    return json({ data: { active: true, currentPeriodEnd: periodEnd } })
  } catch (error) {
    return json(
      { error: "Unable to verify Stripe payment", detail: String(error) },
      500,
    )
  }
}
