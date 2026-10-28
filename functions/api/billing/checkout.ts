import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"

import { json } from "../../_lib/http"

import { assertPaddleCheckoutEnabled, paddleRequest } from "../../_lib/paddle"

import { createBillingCheckout } from "../../_lib/billing-checkout"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  try {
    const session = await requireSession(context, "manageBilling")

    if (isResponse(session)) return session

    try {
      assertPaddleCheckoutEnabled(context.env)
    } catch {
      return json({ error: "New checkouts are currently unavailable" }, 503)
    }

    let interval: "month" | "year"

    try {
      const body = (await context.request.json()) as { interval?: unknown }

      if (body.interval !== "month" && body.interval !== "year")
        return json({ error: "Choose a valid subscription interval" }, 400)

      interval = body.interval
    } catch {
      return json({ error: "Invalid request body" }, 400)
    }

    if (context.env.BILLING_V2_ENABLED === "true")
      return createBillingCheckout(context.env, session.workspace.id, interval)

    const existing = await context.env.DB.prepare(
      "SELECT paddle_subscription_id, subscription_status, current_period_end FROM workspaces WHERE id=?",
    )

      .bind(session.workspace.id)

      .first<{
        paddle_subscription_id: string | null

        subscription_status: string

        current_period_end: string | null
      }>()

    if (
      existing?.paddle_subscription_id &&
      ["active", "trialing", "past_due", "paused"].includes(
        existing.subscription_status,
      ) &&
      (!existing.current_period_end ||
        new Date(existing.current_period_end).getTime() > Date.now())
    )
      return json(
        { error: "This workspace already has a current subscription" },
        409,
      )

    const priceId =
      interval === "month"
        ? context.env.PADDLE_MONTHLY_PRICE_ID
        : context.env.PADDLE_YEARLY_PRICE_ID

    if (!priceId)
      return json({ error: "Paddle pricing is not configured" }, 503)

    try {
      const transaction = await paddleRequest<{ id: string }>(
        context.env,

        "/transactions",

        {
          method: "POST",

          body: JSON.stringify({
            items: [{ price_id: priceId, quantity: 1 }],

            custom_data: { workspace_id: session.workspace.id },

            collection_mode: "automatic",
          }),
        },
      )

      return json({ data: { transactionId: transaction.id } }, 201)
    } catch (error) {
      console.error("Paddle checkout transaction request failed", error)

      return json({ error: "Unable to start checkout right now" }, 502)
    }
  } catch (error) {
    console.error("Billing checkout handler failed", error)

    return json({ error: "Checkout is temporarily unavailable" }, 503)
  }
}
