import { useEffect, useState } from "react"
import AuthLayout, { primaryButton } from "../components/AuthLayout"
import { apiRequest, useAuth } from "../lib/auth"

type Plans = Record<"month" | "year", {
  base: { amount: number; currency: string }
  seat: { amount: number; currency: string }
}>
function money(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}
export default function SubscribePage() {
  const { session, logout } = useAuth()
  const [plans, setPlans] = useState<Plans | null>(null)
  const [interval, setInterval] = useState<"month" | "year">("month")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    apiRequest("/api/billing/plans")
      .then((d) => setPlans(d.data))
      .catch((e) => setError(e.message))
  }, [])
  async function checkout() {
    setSaving(true)
    setError("")
    try {
      const data = await apiRequest("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ interval }),
      })
      window.location.assign(data.data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed")
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
            onClick={() => setInterval(value)}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${
              interval === value ? "bg-white text-navy shadow-sm" : "text-muted"
            }`}
          >
            {value === "month" ? "Monthly" : "Yearly"}
          </button>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-line p-5">
        <p className="text-xs font-extrabold uppercase tracking-wider text-positive">
          Sentinel Operations
        </p>
        <p className="mt-2 text-3xl font-black">
          {plans
            ? money(plans[interval].base.amount, plans[interval].base.currency)
            : "—"}
          <span className="text-xs font-semibold text-muted">
            {" "}
            / {interval}
          </span>
        </p>
        <ul className="mt-4 space-y-2 text-xs text-slate">
          <li>✓ Owner plus 3 member accounts</li>
          <li>✓ Full K9 operations workspace</li>
          <li>✓ Secure role-based access</li>
          <li>
            ✓ Extra members at{" "}
            {plans
              ? money(
                  plans[interval].seat.amount,
                  plans[interval].seat.currency,
                )
              : "—"}{" "}
            each / {interval}
          </li>
        </ul>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
      <button
        onClick={checkout}
        disabled={!plans || saving}
        className={`${primaryButton} mt-5`}
      >
        {saving ? "Opening secure checkout…" : "Continue to Stripe"}
      </button>
      <button
        onClick={() => void logout()}
        className="mt-4 w-full text-xs font-bold text-muted"
      >
        Sign out
      </button>
    </AuthLayout>
  )
}
