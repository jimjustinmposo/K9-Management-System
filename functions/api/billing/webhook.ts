import type { AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"

type PaddleSubscription = {
  id?: string
  customer_id?: string
  status?: string
  custom_data?: Record<string, unknown> | null
  current_billing_period?: { starts_at?: string | null; ends_at?: string | null } | null
  scheduled_change?: { action?: string; effective_at?: string | null } | null
  items?: Array<{ price?: { id?: string } }>
}

type PaddleEvent = {
  event_id?: string
  event_type?: string
  occurred_at?: string
  data?: PaddleSubscription
}

async function verifySignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = new Map(
    signatureHeader.split(";").map((part) => {
      const separator = part.indexOf("=")
      return separator < 0
        ? ["", ""]
        : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()]
    }),
  )
  const timestamp = parts.get("ts")
  const receivedSignature = parts.get("h1")
  if (!timestamp || !receivedSignature || !/^\d+$/.test(timestamp)) return false
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 5) return false

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const digest = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${timestamp}:${rawBody}`),
    ),
  )
  const expected = [...digest]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
  if (expected.length !== receivedSignature.length) return false
  let difference = 0
  for (let index = 0; index < expected.length; index += 1)
    difference |= expected.charCodeAt(index) ^ receivedSignature.charCodeAt(index)
  return difference === 0
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const secret = context.env.PADDLE_WEBHOOK_SECRET
  if (!secret) return json({ error: "Webhook endpoint is not configured" }, 503)

  const rawBody = await context.request.text()
  const signature = context.request.headers.get("Paddle-Signature") ?? ""
  try {
    if (!(await verifySignature(rawBody, signature, secret)))
      return json({ error: "Invalid webhook signature" }, 401)
  } catch {
    return json({ error: "Invalid webhook signature" }, 401)
  }

  let event: PaddleEvent
  try {
    event = JSON.parse(rawBody) as PaddleEvent
  } catch {
    return json({ error: "Invalid webhook payload" }, 400)
  }
  const { event_id: eventId, event_type: eventType, occurred_at: occurredAt, data } = event
  const eventTime = occurredAt ? Date.parse(occurredAt) : Number.NaN
  if (!eventId || !eventType || !Number.isFinite(eventTime))
    return json({ error: "Webhook event is missing required fields" }, 400)

  const now = new Date().toISOString()
  const inserted = await context.env.DB.prepare(
    "INSERT OR IGNORE INTO paddle_webhook_events (event_id,event_type,occurred_at,status,received_at) VALUES (?,?,?,'processing',?)",
  )
    .bind(eventId, eventType, occurredAt, now)
    .run()
  if (!inserted.meta?.changes) {
    const previous = await context.env.DB.prepare(
      "SELECT status FROM paddle_webhook_events WHERE event_id=?",
    )
      .bind(eventId)
      .first<{ status: string }>()
    if (!previous || previous.status !== "failed")
      return json({ success: true, duplicate: true })
    const retry = await context.env.DB.prepare(
      "UPDATE paddle_webhook_events SET status='processing',received_at=?,processed_at=NULL,error=NULL WHERE event_id=? AND status='failed'",
    )
      .bind(now, eventId)
      .run()
    if (!retry.meta?.changes) return json({ success: true, duplicate: true })
  }

  try {
    if (eventType.startsWith("subscription.")) {
      if (!data?.id || !data.customer_id || !data.status)
        throw new Error("Subscription event is missing identifiers or status")

      const workspaceId = data.custom_data?.workspace_id
      if (typeof workspaceId !== "string" || !workspaceId)
        throw new Error("Subscription has no workspace association")

      const priceId = data.items?.[0]?.price?.id ?? null
      const plan =
        priceId === context.env.PADDLE_MONTHLY_PRICE_ID
          ? "month"
          : priceId === context.env.PADDLE_YEARLY_PRICE_ID
            ? "year"
            : null
      if (!plan) throw new Error("Subscription price is not configured")

      await context.env.DB.prepare(
        `UPDATE workspaces SET
          paddle_customer_id=?, paddle_subscription_id=?, paddle_price_id=?, paddle_plan=?,
          subscription_status=?, billing_interval=?,
          paddle_current_period_start=?, current_period_end=?, paddle_scheduled_cancel_at=?,
          paddle_last_synced_at=?, paddle_last_event_at=?, updated_at=?
         WHERE id=? AND (paddle_last_event_at IS NULL OR paddle_last_event_at<=?)`,
      )
        .bind(
          data.customer_id,
          data.id,
          priceId,
          plan,
          data.status,
          plan,
          data.current_billing_period?.starts_at ?? null,
          data.current_billing_period?.ends_at ?? null,
          data.scheduled_change?.action === "cancel"
            ? (data.scheduled_change.effective_at ?? null)
            : null,
          now,
          occurredAt,
          now,
          workspaceId,
          occurredAt,
        )
        .run()
    }

    await context.env.DB.prepare(
      "UPDATE paddle_webhook_events SET status='completed',processed_at=?,error=NULL WHERE event_id=?",
    )
      .bind(now, eventId)
      .run()
    return json({ success: true })
  } catch (error) {
    console.error("Paddle webhook processing failed", eventId, error)
    await context.env.DB.prepare(
      "UPDATE paddle_webhook_events SET status='failed',processed_at=?,error=? WHERE event_id=?",
    )
      .bind(now, error instanceof Error ? error.message.slice(0, 500) : "Processing failed", eventId)
      .run()
    return json({ error: "Webhook processing failed" }, 500)
  }
}