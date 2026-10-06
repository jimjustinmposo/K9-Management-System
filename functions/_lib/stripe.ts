import type { AppEnv } from "./auth"

export async function stripe(
  env: AppEnv,
  path: string,
  init: { method?: string; body?: URLSearchParams } = {},
): Promise<any> {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured")
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Stripe-Version": "2026-07-29.dahlia",
      ...(init.body
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body: init.body,
  })
  const data = (await response.json()) as any
  if (!response.ok)
    throw new Error(data?.error?.message || "Stripe request failed")
  return data
}

export function stripePrice(
  env: AppEnv,
  interval: string,
  seat = false,
): string {
  const value = seat
    ? interval === "year"
      ? env.STRIPE_YEARLY_SEAT_PRICE_ID
      : env.STRIPE_MONTHLY_SEAT_PRICE_ID
    : interval === "year"
      ? env.STRIPE_YEARLY_PRICE_ID
      : env.STRIPE_MONTHLY_PRICE_ID
  if (!value)
    throw new Error(`Stripe ${seat ? "seat" : "base"} price is not configured`)
  return value
}
