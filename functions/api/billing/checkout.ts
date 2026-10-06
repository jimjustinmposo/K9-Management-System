import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { appUrl, json } from "../../_lib/http"
import { stripe, stripePrice } from "../../_lib/stripe"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageBilling")
  if (isResponse(session)) return session
  try {
    const body = (await context.request.json()) as any
    const interval = body.interval === "year" ? "year" : "month"
    const workspace = await context.env.DB.prepare(
      "SELECT * FROM workspaces WHERE id=?",
    )
      .bind(session.workspace.id)
      .first<any>()
    if (
      workspace.stripe_subscription_id &&
      ["active", "trialing", "past_due"].includes(workspace.subscription_status)
    )
      return json({ error: "This workspace already has a subscription" }, 409)
    let customerId = workspace.stripe_customer_id
    if (!customerId) {
      const params = new URLSearchParams({
        email: session.user.email,
        name: session.workspace.name,
        "metadata[workspace_id]": session.workspace.id,
      })
      const customer = await stripe(context.env, "customers", {
        method: "POST",
        body: params,
      })
      customerId = customer.id
      await context.env.DB.prepare(
        "UPDATE workspaces SET stripe_customer_id=?,updated_at=? WHERE id=?",
      )
        .bind(customerId, new Date().toISOString(), session.workspace.id)
        .run()
    }
    const base = appUrl(context.request, context.env.APP_URL)
    const params = new URLSearchParams({
      mode: "subscription",
      integration_identifier: `sentinel_k9_${randomLetters(8)}`,
      customer: customerId,
      "line_items[0][price]": stripePrice(context.env, interval),
      "line_items[0][quantity]": "1",
      success_url: `${base}/subscription?checkout=success`,
      cancel_url: `${base}/subscribe?checkout=cancelled`,
      client_reference_id: session.workspace.id,
      "subscription_data[metadata][workspace_id]": session.workspace.id,
      "metadata[workspace_id]": session.workspace.id,
      "metadata[interval]": interval,
    })
    if (context.env.STRIPE_TAX_ENABLED === "true") {
      params.set("automatic_tax[enabled]", "true")
      params.set("billing_address_collection", "required")
      params.set("customer_update[address]", "auto")
      params.set("customer_update[name]", "auto")
    }
    const checkout = await stripe(context.env, "checkout/sessions", {
      method: "POST",
      body: params,
    })
    return json({ data: { url: checkout.url } })
  } catch (error) {
    return json(
      { error: "Unable to start checkout", detail: String(error) },
      500,
    )
  }
}

function randomLetters(length: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz"
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("")
}
