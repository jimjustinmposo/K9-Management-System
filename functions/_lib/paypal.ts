import type { AppEnv } from "./auth"

function baseUrl(env: AppEnv) {
  return env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com"
}

export async function paypalAccessToken(env: AppEnv): Promise<string> {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET)
    throw new Error("PayPal is not configured")
  const credentials = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)
  const response = await fetch(`${baseUrl(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })
  const data = (await response.json()) as any
  if (!response.ok || !data.access_token)
    throw new Error(data?.error_description || "PayPal authentication failed")
  return data.access_token
}

export async function paypal(
  env: AppEnv,
  path: string,
  init: { method?: string; body?: unknown; headers?: HeadersInit } = {},
): Promise<any> {
  const response = await fetch(`${baseUrl(env)}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${await paypalAccessToken(env)}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok)
    throw new Error(
      data?.details?.[0]?.description || data?.message || "PayPal request failed",
    )
  return data
}

export function paypalPlan(env: AppEnv, interval: string): string {
  const planId =
    interval === "year"
      ? env.PAYPAL_YEARLY_PLAN_ID
      : env.PAYPAL_MONTHLY_PLAN_ID
  if (!planId) throw new Error(`PayPal ${interval} plan is not configured`)
  return planId
}

export interface PaypalPlanDetails {
  id: string
  name: string
  value: string
  currency: string
  interval: "month" | "year"
  status: string
  configured: true
}

export async function paypalPlanDetails(
  env: AppEnv,
  interval: "month" | "year",
): Promise<PaypalPlanDetails> {
  const planId = paypalPlan(env, interval)
  const plan = await paypal(
    env,
    `/v1/billing/plans/${encodeURIComponent(planId)}`,
  )
  const regularCycle = plan.billing_cycles?.find(
    (cycle: any) => cycle.tenure_type === "REGULAR",
  )
  const expectedUnit = interval === "year" ? "YEAR" : "MONTH"
  const frequency = regularCycle?.frequency
  const fixedPrice = regularCycle?.pricing_scheme?.fixed_price
  if (
    plan.status !== "ACTIVE" ||
    frequency?.interval_unit !== expectedUnit ||
    Number(frequency?.interval_count) !== 1 ||
    !fixedPrice?.value ||
    !fixedPrice?.currency_code
  )
    throw new Error(
      `The PayPal ${interval} plan is inactive or has an unexpected billing cycle`,
    )
  return {
    id: plan.id,
    name: plan.name || `Sentinel ${interval}ly`,
    value: String(fixedPrice.value),
    currency: String(fixedPrice.currency_code).toUpperCase(),
    interval,
    status: plan.status,
    configured: true,
  }
}
