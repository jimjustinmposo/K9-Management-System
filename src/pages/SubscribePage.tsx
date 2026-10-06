import { useState } from "react"
import AuthLayout, { primaryButton } from "../components/AuthLayout"
import { apiRequest, useAuth } from "../lib/auth"

type Interval = "month" | "year"

const plans: Record<Interval, { amount: string; period: string }> = {
  month: {
    amount: "AED 150",
    period: "month",
  },
  year: {
    amount: "AED 1,620",
    period: "year",
  },
}

export default function SubscribePage() {
  const { session, logout } = useAuth()
  const [interval, setInterval] = useState<Interval>("month")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const plan = plans[interval]

  async function checkout() {
    setSaving(true)
    setError("")
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
            {value === "year" && (
              <span className="ml-2 inline-flex rounded-full bg-positive-soft px-2 py-0.5 text-[8px] font-extrabold uppercase text-positive">
                Save 10%
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
          {interval === "year" && (
            <span className="rounded-full bg-positive-soft px-2.5 py-1 text-[9px] font-extrabold uppercase text-positive">
              10% discount
            </span>
          )}
        </div>
        <p className="mt-4 text-3xl font-black text-ink">
          {plan.amount}
          <span className="text-xs font-semibold text-muted"> / {plan.period}</span>
        </p>
        {interval === "year" && (
          <p className="mt-1 text-[11px] font-semibold text-positive">
            AED 135 per month, billed yearly
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
        disabled={saving}
        className={`${primaryButton} mt-5`}
      >
        {saving ? "Opening secure checkout…" : `Continue with ${plan.amount}`}
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
