export type BillingInterval = "month" | "year"

export interface BillingPlan {
  id: string
  name: string
  value: string
  currency: string
  interval: BillingInterval
  status: string
  configured: true
}

export interface UnavailableBillingPlan {
  configured: false
  error: string
}

export type BillingPlans = Record<
  BillingInterval,
  BillingPlan | UnavailableBillingPlan
>

export function isBillingPlan(
  plan: BillingPlan | UnavailableBillingPlan | undefined,
): plan is BillingPlan {
  return Boolean(plan?.configured)
}

export function formatPlanMoney(value: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value))
}
