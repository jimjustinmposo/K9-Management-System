import type { AppEnv } from "./auth"
import { billingEnvironment, billingTime, verifiedSubscription } from "./billing-state"
import { paddleRequest } from "./paddle"
import { json } from "./http"

/** Called only after raw-body signature verification. Receipt and state commit together. */
export async function processBillingEvent(env: AppEnv, payload: unknown): Promise<Response> {
  const event = payload as { event_id?: string; event_type?: string; occurred_at?: string; data?: { id?: string; transaction_id?: string; subscription_id?: string } } | null
  if (!event || typeof event.event_id !== "string" || !/^evt_[a-z0-9]{26}$/.test(event.event_id) ||
      typeof event.event_type !== "string") return json({ error: "Invalid billing event" }, 400)
  const environment = billingEnvironment(env)
  let occurredAt: string
  try { occurredAt = billingTime(event.occurred_at) } catch { return json({ error: "Invalid event timestamp" }, 400) }
  const exists = () => env.DB.prepare("SELECT event_id FROM billing_event_receipts WHERE environment=? AND event_id=?")
    .bind(environment, event.event_id).first()
  try {
    if (await exists()) return json({ success: true, duplicate: true })
    const statements = [env.DB.prepare(`INSERT INTO billing_event_receipts
      (environment,event_id,event_type,occurred_at,completed_at) VALUES (?,?,?,?,?)`)
      .bind(environment, event.event_id, event.event_type, occurredAt, new Date().toISOString())]
    const subscriptionId = event.event_type.startsWith("subscription.") ? event.data?.id :
      ["transaction.completed", "transaction.payment_failed"].includes(event.event_type) ? event.data?.subscription_id : undefined
    if (event.event_type.startsWith("subscription.") && !subscriptionId) throw new Error("Missing subscription")
    if (subscriptionId) {
      const { state, interval, version, periodEnd, scheduledAt } = await verifiedSubscription(env, subscriptionId)
      let association = await env.DB.prepare(`SELECT workspace_id,customer_id FROM billing_subscriptions
        WHERE environment=? AND subscription_id=?`).bind(environment, subscriptionId)
        .first<{ workspace_id: string; customer_id: string }>()
      let attemptId: string | null = null
      if (!association) {
        // Only the creation event carries the authoritative originating transaction.
        const transactionId = event.event_type === "subscription.created" ? event.data?.transaction_id : undefined
        if (!transactionId || !/^txn_[a-z0-9]{26}$/.test(transactionId)) throw new Error("Awaiting verified creation event")
        const attempt = await env.DB.prepare(`SELECT id,workspace_id,price_id FROM billing_checkout_attempts
          WHERE environment=? AND transaction_id=? AND state IN ('ready','completed')`)
          .bind(environment, transactionId).first<{ id: string; workspace_id: string; price_id: string }>()
        if (!attempt) throw new Error("No trusted checkout association")
        const transaction = await paddleRequest<{ id: string; subscription_id: string; customer_id: string }>(
          env, `/transactions/${transactionId}`, { method: "GET" })
        if (transaction.id !== transactionId || transaction.subscription_id !== subscriptionId ||
            transaction.customer_id !== state.customer_id || attempt.price_id !== state.items[0].price.id)
          throw new Error("Checkout association mismatch")
        association = { workspace_id: attempt.workspace_id, customer_id: state.customer_id }
        attemptId = attempt.id
      }
      if (association.customer_id !== state.customer_id) throw new Error("Subscription customer changed")
      statements.push(env.DB.prepare(`INSERT INTO billing_subscriptions
        (environment,subscription_id,workspace_id,customer_id,price_id,billing_interval,status,period_end,scheduled_action,scheduled_at,version)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(environment,subscription_id) DO UPDATE SET
          price_id=excluded.price_id,billing_interval=excluded.billing_interval,status=excluded.status,
          period_end=excluded.period_end,scheduled_action=excluded.scheduled_action,scheduled_at=excluded.scheduled_at,version=excluded.version
        WHERE billing_subscriptions.version < excluded.version
          AND billing_subscriptions.workspace_id=excluded.workspace_id AND billing_subscriptions.customer_id=excluded.customer_id`)
        .bind(environment, subscriptionId, association.workspace_id, state.customer_id, state.items[0].price.id,
          interval, state.status, periodEnd, state.scheduled_change?.action ?? null, scheduledAt, version))
      if (attemptId) statements.push(env.DB.prepare("UPDATE billing_checkout_attempts SET state='completed' WHERE environment=? AND id=?")
        .bind(environment, attemptId))
    }
    await env.DB.batch(statements)
    return json({ success: true })
  } catch {
    // A competing delivery may have committed the same receipt. Otherwise ask Paddle to retry.
    if (await exists().catch(() => null)) return json({ success: true, duplicate: true })
    console.error("Billing event not committed", event.event_id)
    return json({ error: "Billing event could not be processed; retry required" }, 503)
  }
}