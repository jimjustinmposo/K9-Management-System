import { useEffect, useMemo, useState } from "react"
import AuthLayout, { primaryButton } from "../components/AuthLayout"
import { apiRequest, useAuth } from "../lib/auth"
import {
  type BillingInterval as Interval,
  type BillingPlans,
  formatPlanMoney,
  isBillingPlan,
} from "../lib/billing"

export default function SubscribePage() {
  const { session, logout } = useAuth()
  const [interval, setInterval] = useState<Interval>("month")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [plans, setPlans] = useState<BillingPlans | null>(null)
  const plan = plans?.[interval]
  const price = isBillingPlan(plan)
    ? formatPlanMoney(plan.value, plan.currency)
    : "—"
  const discountPercent = useMemo(() => {
    const month = plans?.month
    const year = plans?.year
    if (
      !isBillingPlan(month) ||
      !isBillingPlan(year) ||
      month.currency !== year.currency
    )
      return 0
    const regularAnnual = Number(month.value) * 12
    return regularAnnual > Number(year.value)
      ? Math.round(
          ((regularAnnual - Number(year.value)) / regularAnnual) * 100,
        )
      : 0
  }, [plans])

  useEffect(() => {
    apiRequest("/api/billing/plans")
      .then((result) => setPlans(result.data))
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load plans",
        ),
      )
  }, [])

  async function checkout() {
    setSaving(true)
    setError("")
    if (!isBillingPlan(plan)) {
      setError(plan?.error || "PayPal billing is being configured. Please try again shortly.")
      setSaving(false)
      return
    }
    try {
      const result = await apiRequest("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ interval }),
      })
      window.location.assign(result.data.url)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open PayPal")
      setSaving(false)
    }
  }

  return (
    <AuthLayout
      title="Activate Sentinel"
      subtitle={`Choose billing for ${session?.workspace.name ?? "your workspace"}. Your owner account and 3 members are included.`}
    >
      <div className="mt-6 grid grid-cols-2 rounded-xl bg-canvas p-1">
        {(["month", "year"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setInterval(value)}
            className={`relative rounded-lg px-3 py-2.5 text-xs font-bold ${
              interval === value ? "bg-white text-navy shadow-sm" : "text-muted"
            }`}
          >
            {value === "month" ? "Monthly" : "Yearly"}
            {value === "year" && discountPercent > 0 && (
              <span className="ml-2 inline-flex rounded-full bg-positive-soft px-2 py-0.5 text-[8px] font-extrabold uppercase text-positive">
                Save {discountPercent}%
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-line p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-extrabold uppercase tracking-wider text-positive">
            Sentinel Operations
          </p>
          {interval === "year" && discountPercent > 0 && (
            <span className="rounded-full bg-positive-soft px-2.5 py-1 text-[9px] font-extrabold uppercase text-positive">
              {discountPercent}% discount
            </span>
          )}
        </div>
        <p className="mt-4 text-3xl font-black text-ink">
          {price}
          <span className="text-xs font-semibold text-muted"> / {interval}</span>
        </p>
        {interval === "year" && isBillingPlan(plan) && (
          <p className="mt-1 text-[11px] font-semibold text-positive">
            {formatPlanMoney(Number(plan.value) / 12, plan.currency)} per month, billed yearly
          </p>
        )}
        <ul className="mt-5 space-y-2 text-xs text-slate">
          <li>✓ Owner plus 3 member accounts</li>
          <li>✓ Full K9 operations workspace</li>
          <li>✓ Secure role-based access</li>
          <li>✓ Monthly or yearly secure PayPal billing</li>
        </ul>
      </div>

      {error && <p role="alert" className="mt-4 text-xs font-bold text-danger">{error}</p>}

      <button
        type="button"
        onClick={() => void checkout()}
        disabled={saving || !isBillingPlan(plan)}
        className={`${primaryButton} mt-5`}
      >
        {saving ? "Opening secure checkout…" : `Continue with ${price}`}
      </button>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-4 w-full text-xs font-bold text-muted"
      >
        Sign out
      </button>
    </AuthLayout>
  )
}
