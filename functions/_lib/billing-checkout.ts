import type { AppEnv } from "./auth"
import { billingEnvironment, validateBillingPrice } from "./billing-state"
import { paddleRequest } from "./paddle"
import { json } from "./http"

export async function createBillingCheckout(env: AppEnv, workspaceId: string, interval: "month" | "year") {
  const environment = billingEnvironment(env)
  const priceId = interval === "month" ? env.PADDLE_MONTHLY_PRICE_ID : env.PADDLE_YEARLY_PRICE_ID
  if (!priceId) return json({ error: "Pricing is unavailable" }, 503)
  try {
    const active = await env.DB.prepare(`SELECT subscription_id FROM billing_subscriptions
      WHERE environment=? AND workspace_id=? AND status IN ('active','trialing','past_due','paused') LIMIT 1`)
      .bind(environment, workspaceId).first()
    if (active) return json({ error: "Manage the existing subscription instead" }, 409)
    const open = await env.DB.prepare(`SELECT transaction_id,price_id,state FROM billing_checkout_attempts
      WHERE environment=? AND workspace_id=? AND state IN ('creating','ready','review')`)
      .bind(environment, workspaceId).first<{ transaction_id: string | null; price_id: string; state: string }>()
    if (open) {
      if (open.state === "ready" && open.transaction_id && open.price_id === priceId)
        return json({ data: { transactionId: open.transaction_id } })
      return json({ error: "A checkout is pending. Contact support before starting another." }, 409)
    }
    await validateBillingPrice(env, priceId)
    const id = crypto.randomUUID()
    // Unique partial index permits only one outstanding checkout, including concurrent requests.
    await env.DB.prepare(`INSERT INTO billing_checkout_attempts
      (id,environment,workspace_id,price_id,state,created_at) VALUES (?,?,?,?,'creating',?)`)
      .bind(id, environment, workspaceId, priceId, new Date().toISOString()).run()
    try {
      const transaction = await paddleRequest<{ id: string }>(env, "/transactions", {
        method: "POST", body: JSON.stringify({ items: [{ price_id: priceId, quantity: 1 }],
          custom_data: { checkout_attempt_id: id }, collection_mode: "automatic" }),
      })
      if (!/^txn_[a-z0-9]{26}$/.test(transaction.id)) throw new Error("Invalid transaction")
      await env.DB.prepare("UPDATE billing_checkout_attempts SET transaction_id=?,state='ready' WHERE id=? AND state='creating'")
        .bind(transaction.id, id).run()
      return json({ data: { transactionId: transaction.id } }, 201)
    } catch {
      // Never retry an ambiguous provider write automatically. Retain the attempt for reconciliation.
      await env.DB.prepare("UPDATE billing_checkout_attempts SET state='review' WHERE id=? AND state='creating'").bind(id).run()
      return json({ error: "Checkout needs reconciliation. Please contact support." }, 503)
    }
  } catch {
    return json({ error: "Checkout is unavailable or another request is pending" }, 503)
  }
}