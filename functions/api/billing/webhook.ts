import type { AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"
import { stripe } from "../../_lib/stripe"

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function equalHex(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

async function validSignature(raw: string, header: string, secret: string): Promise<boolean> {
  const parts = header.split(",").map((part) => part.split("=", 2))
  const timestamp = Number(parts.find(([key]) => key === "t")?.[1])
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value)
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300 || !signatures.length) return false
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`)))
  return signatures.some((signature) => equalHex(expected, signature))
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const raw = await context.request.text()
  const signature = context.request.headers.get("Stripe-Signature") ?? ""
  if (!context.env.STRIPE_WEBHOOK_SECRET || !(await validSignature(raw, signature, context.env.STRIPE_WEBHOOK_SECRET))) return json({ error: "Invalid webhook signature" }, 400)

  const event = JSON.parse(raw)
  const claimed = await context.env.DB.prepare("INSERT OR IGNORE INTO stripe_events (id,event_type,processed_at,status,created_at) VALUES (?,?,?,?,?)")
    .bind(event.id, event.type, new Date().toISOString(), "processing", new Date().toISOString()).run()
  if (claimed.meta?.changes === 0) return json({ received: true })

  try {
    const object = event.data.object
    const clientReference = String(object.client_reference_id || "")
    const [referenceWorkspaceId, referenceInterval] = clientReference.split(":")
    let workspaceId = object.metadata?.workspace_id || referenceWorkspaceId
    const eventCreated = Number(event.created ?? 0)

    if (event.type === "checkout.session.completed" && workspaceId && object.subscription) {
      const subscription = await stripe(context.env, `subscriptions/${object.subscription}`)
      const items = subscription.items?.data ?? []
      const baseIds = [context.env.STRIPE_MONTHLY_PRICE_ID, context.env.STRIPE_YEARLY_PRICE_ID]
      const seatIds = [context.env.STRIPE_MONTHLY_SEAT_PRICE_ID, context.env.STRIPE_YEARLY_SEAT_PRICE_ID]
      const baseItem = items.find((item: any) => baseIds.includes(item.price?.id)) || items[0]
      const seatItem = items.find((item: any) => seatIds.includes(item.price?.id))
      const interval = referenceInterval || baseItem?.price?.recurring?.interval || "month"
      const currentPeriodEnd = subscription.current_period_end || baseItem?.current_period_end
      const periodEnd = currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null
      await context.env.DB.prepare("UPDATE workspaces SET stripe_customer_id=?,stripe_subscription_id=?,stripe_base_item_id=?,stripe_seat_item_id=?,billing_interval=?,subscription_status=?,current_period_end=?,updated_at=? WHERE id=?")
        .bind(object.customer, object.subscription, baseItem?.id || null, seatItem?.id || null, interval, subscription.status, periodEnd, new Date().toISOString(), workspaceId).run()
      if (["active", "trialing"].includes(subscription.status)) {
        await context.env.DB.prepare("UPDATE k9_roster SET workspace_id=? WHERE workspace_id IS NULL").bind(workspaceId).run()
      }
    }

    if (event.type.startsWith("customer.subscription.") && !workspaceId) {
      const workspace = await context.env.DB.prepare("SELECT id FROM workspaces WHERE stripe_subscription_id=? OR stripe_customer_id=? LIMIT 1")
        .bind(object.id, object.customer).first<{ id: string }>()
      workspaceId = workspace?.id
    }

    if (event.type.startsWith("customer.subscription.") && workspaceId) {
      const baseIds = [context.env.STRIPE_MONTHLY_PRICE_ID, context.env.STRIPE_YEARLY_PRICE_ID]
      const seatIds = [context.env.STRIPE_MONTHLY_SEAT_PRICE_ID, context.env.STRIPE_YEARLY_SEAT_PRICE_ID]
      const items = object.items?.data ?? []
      const baseItem = items.find((item: any) => baseIds.includes(item.price?.id))
      const seatItem = items.find((item: any) => seatIds.includes(item.price?.id))
      const interval = baseItem?.price?.recurring?.interval || "month"
      const currentPeriodEnd = object.current_period_end || baseItem?.current_period_end
      const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null
      const updated = await context.env.DB.prepare(`UPDATE workspaces SET stripe_customer_id=?,stripe_subscription_id=?,stripe_base_item_id=?,stripe_seat_item_id=?,billing_interval=?,subscription_status=?,current_period_end=?,stripe_last_event_created=?,updated_at=? WHERE id=? AND stripe_last_event_created<=?`)
        .bind(object.customer, object.id, baseItem?.id || null, seatItem?.id || null, interval, object.status, periodEnd, eventCreated, new Date().toISOString(), workspaceId, eventCreated).run()
      if (updated.meta?.changes && ["active", "trialing"].includes(object.status)) {
        await context.env.DB.prepare("UPDATE k9_roster SET workspace_id=? WHERE workspace_id IS NULL").bind(workspaceId).run()
      }
    }

    const subscriptionId = typeof object.subscription === "string" ? object.subscription : object.subscription?.id
    if (subscriptionId && ["invoice.payment_failed", "invoice.payment_action_required"].includes(event.type)) {
      await context.env.DB.prepare("UPDATE workspaces SET subscription_status='past_due',stripe_last_event_created=?,updated_at=? WHERE stripe_subscription_id=? AND stripe_last_event_created<=?")
        .bind(eventCreated, new Date().toISOString(), subscriptionId, eventCreated).run()
    }
    if (subscriptionId && ["invoice.paid", "invoice.payment_succeeded"].includes(event.type)) {
      await context.env.DB.prepare("UPDATE workspaces SET subscription_status='active',stripe_last_event_created=?,updated_at=? WHERE stripe_subscription_id=? AND stripe_last_event_created<=? AND subscription_status IN ('past_due','unpaid','incomplete')")
        .bind(eventCreated, new Date().toISOString(), subscriptionId, eventCreated).run()
    }

    await context.env.DB.prepare("UPDATE stripe_events SET status='completed',processed_at=?,error=NULL WHERE id=?")
      .bind(new Date().toISOString(), event.id).run()
    return json({ received: true })
  } catch (error) {
    await context.env.DB.prepare("DELETE FROM stripe_events WHERE id=?").bind(event.id).run()
    return json({ error: "Webhook processing failed", detail: String(error) }, 500)
  }
}
