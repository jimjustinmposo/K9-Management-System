import type { AppEnv } from "./auth"
import { paddleRequest } from "./paddle"

export function billingEnvironment(env: AppEnv): "sandbox" | "production" {
  if (env.PADDLE_ENVIRONMENT !== "sandbox" && env.PADDLE_ENVIRONMENT !== "production")
    throw new Error("Billing environment is required")
  return env.PADDLE_ENVIRONMENT
}

// Fixed-width UTC timestamp preserves Paddle's microsecond ordering in SQLite TEXT.
export function billingTime(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid billing timestamp")
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?Z$/.exec(value)
  if (!match || !Number.isFinite(Date.parse(value))) throw new Error("Invalid billing timestamp")
  return `${match[1]}.${(match[2] ?? "").padEnd(6, "0")}Z`
}

export function billingPlan(env: AppEnv, priceId: string): "month" | "year" {
  if (priceId === env.PADDLE_MONTHLY_PRICE_ID) return "month"
  if (priceId === env.PADDLE_YEARLY_PRICE_ID) return "year"
  throw new Error("Unknown billing price")
}

export async function validateBillingPrice(env: AppEnv, priceId: string): Promise<void> {
  const interval = billingPlan(env, priceId)
  const price = await paddleRequest<{
    id: string; product_id: string; status: string;
    billing_cycle: { interval: string; frequency: number } | null;
  }>(env, `/prices/${encodeURIComponent(priceId)}`, { method: "GET" })
  const expectedProduct = interval === "month" ? env.PADDLE_MONTHLY_PRODUCT_ID : env.PADDLE_YEARLY_PRODUCT_ID
  if (!expectedProduct || price.id !== priceId || price.product_id !== expectedProduct || price.status !== "active" ||
      price.billing_cycle?.interval !== interval || price.billing_cycle.frequency !== 1)
    throw new Error("Billing catalog mapping mismatch")
}

export type SubscriptionState = {
  id: string; customer_id: string; status: string; updated_at: string;
  current_billing_period: { ends_at: string } | null;
  scheduled_change: { action: string; effective_at: string } | null;
  items: Array<{ quantity: number; price: { id: string; product_id: string } }>;
}

export async function verifiedSubscription(env: AppEnv, id: string) {
  if (!/^sub_[a-z0-9]{26}$/.test(id)) throw new Error("Invalid subscription ID")
  const state = await paddleRequest<SubscriptionState>(env, `/subscriptions/${id}`, { method: "GET" })
  if (state.id !== id || !/^ctm_[a-z0-9]{26}$/.test(state.customer_id) ||
      !["active", "trialing", "past_due", "paused", "canceled"].includes(state.status) ||
      !Array.isArray(state.items) || state.items.length !== 1 || state.items[0].quantity !== 1)
    throw new Error("Unsupported subscription state")
  const price = state.items[0].price
  const interval = billingPlan(env, price.id)
  const product = interval === "month" ? env.PADDLE_MONTHLY_PRODUCT_ID : env.PADDLE_YEARLY_PRODUCT_ID
  if (!product || price.product_id !== product) throw new Error("Subscription product mismatch")
  return {
    state, interval, version: billingTime(state.updated_at),
    periodEnd: state.current_billing_period ? billingTime(state.current_billing_period.ends_at) : null,
    scheduledAt: state.scheduled_change ? billingTime(state.scheduled_change.effective_at) : null,
  }
}

export async function billingAccess(db: D1Database, workspaceId: string, environment: string, now = Date.now()) {
  const subscription = await db.prepare(`SELECT status,billing_interval,period_end FROM billing_subscriptions
    WHERE environment=? AND workspace_id=? ORDER BY CASE WHEN status='active' AND period_end>? THEN 0 ELSE 1 END, version DESC LIMIT 1`)
    .bind(environment, workspaceId, billingTime(new Date(now).toISOString())).first<{ status: string; billing_interval: string; period_end: string | null }>()
  const grant = environment === "production" ? await db.prepare("SELECT expires_at FROM billing_legacy_grants WHERE workspace_id=?")
    .bind(workspaceId).first<{ expires_at: string }>() : null
  const paid = subscription?.status === "active" && !!subscription.period_end && Date.parse(subscription.period_end) > now
  const legacy = !!grant && Date.parse(grant.expires_at) > now
  return {
    status: paid ? "active" : legacy ? "legacy" : subscription?.status ?? "incomplete",
    interval: subscription?.billing_interval ?? "month",
    periodEnd: paid ? subscription!.period_end : legacy ? grant!.expires_at : subscription?.period_end ?? null,
    writable: paid || legacy,
  }
}