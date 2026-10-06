import type { AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"
import { paypal } from "../../_lib/paypal"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const event = (await context.request.json()) as any
  if (!context.env.PAYPAL_WEBHOOK_ID)
    return json({ error: "PayPal webhook is not configured" }, 503)
  const verification = await paypal(
    context.env,
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: {
        auth_algo: context.request.headers.get("PAYPAL-AUTH-ALGO"),
        cert_url: context.request.headers.get("PAYPAL-CERT-URL"),
        transmission_id: context.request.headers.get("PAYPAL-TRANSMISSION-ID"),
        transmission_sig: context.request.headers.get("PAYPAL-TRANSMISSION-SIG"),
        transmission_time: context.request.headers.get("PAYPAL-TRANSMISSION-TIME"),
        webhook_id: context.env.PAYPAL_WEBHOOK_ID,
        webhook_event: event,
      },
    },
  )
  if (verification.verification_status !== "SUCCESS")
    return json({ error: "Invalid PayPal webhook signature" }, 400)

  const claimed = await context.env.DB.prepare(
    "INSERT OR IGNORE INTO payment_events (id,event_type,status,processed_at,created_at) VALUES (?,?,?,?,?)",
  )
    .bind(event.id, event.event_type, "processing", new Date().toISOString(), event.create_time)
    .run()
  if (claimed.meta?.changes === 0) return json({ received: true })

  try {
    const resource = event.resource || {}
    const subscriptionId = resource.id?.startsWith("I-")
      ? resource.id
      : resource.billing_agreement_id
    let workspace: { id: string } | null = null
    if (subscriptionId) {
      workspace = await context.env.DB.prepare(
        "SELECT id FROM workspaces WHERE paypal_subscription_id=? LIMIT 1",
      )
        .bind(subscriptionId)
        .first<{ id: string }>()
    }
    if (workspace && event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
      await context.env.DB.prepare(
        "UPDATE workspaces SET subscription_status='active',current_period_end=?,paypal_payer_id=?,paypal_last_event_time=?,updated_at=? WHERE id=? AND COALESCE(paypal_last_event_time,'')<=?",
      )
        .bind(
          resource.billing_info?.next_billing_time || null,
          resource.subscriber?.payer_id || null,
          event.create_time,
          new Date().toISOString(),
          workspace.id,
          event.create_time,
        )
        .run()
    }
    if (workspace && event.event_type === "PAYMENT.SALE.COMPLETED") {
      const subscription = await paypal(
        context.env,
        `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
      )
      if (subscription.status === "ACTIVE")
        await context.env.DB.prepare(
          "UPDATE workspaces SET subscription_status='active',current_period_end=?,paypal_last_event_time=?,updated_at=? WHERE id=? AND COALESCE(paypal_last_event_time,'')<=?",
        )
          .bind(
            subscription.billing_info?.next_billing_time || null,
            event.create_time,
            new Date().toISOString(),
            workspace.id,
            event.create_time,
          )
          .run()
    }
    if (
      workspace &&
      [
        "BILLING.SUBSCRIPTION.CANCELLED",
        "BILLING.SUBSCRIPTION.SUSPENDED",
        "BILLING.SUBSCRIPTION.EXPIRED",
        "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
      ].includes(event.event_type)
    ) {
      const status = event.event_type.endsWith("PAYMENT.FAILED")
        ? "past_due"
        : event.event_type.split(".").at(-1)?.toLowerCase()
      await context.env.DB.prepare(
        "UPDATE workspaces SET subscription_status=?,paypal_last_event_time=?,updated_at=? WHERE id=? AND COALESCE(paypal_last_event_time,'')<=?",
      )
        .bind(status, event.create_time, new Date().toISOString(), workspace.id, event.create_time)
        .run()
    }
    await context.env.DB.prepare(
      "UPDATE payment_events SET status='completed',processed_at=?,error=NULL WHERE id=?",
    )
      .bind(new Date().toISOString(), event.id)
      .run()
    return json({ received: true })
  } catch (error) {
    await context.env.DB.prepare("DELETE FROM payment_events WHERE id=?")
      .bind(event.id)
      .run()
    return json({ error: "PayPal webhook processing failed", detail: String(error) }, 500)
  }
}
