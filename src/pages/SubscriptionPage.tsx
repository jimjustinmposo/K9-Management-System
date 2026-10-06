import { useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import { AppShell, Icon } from "../components/AppShell"
import { apiRequest } from "../lib/auth"

type Interval = "month" | "year"
type Plans = Record<Interval, {
  amount: number
  currency: string
  configured: boolean
}>

function money(amount: number, currency: string) {
  return `${currency.toUpperCase()} ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount / 100)}`
}

const DISPLAY_PRICES: Record<Interval, { amount: number; currency: string }> = {
  month: { amount: 15000, currency: "aed" },
  year: { amount: 162000, currency: "aed" },
}

const benefits = [
  "Complete K9 profiles and operational records",
  "Training, medical, and certification tracking",
  "Deployment history and readiness analytics",
  "Secure reports and data exports",
]

export default function SubscriptionPage() {
  const location = useLocation()
  const [plans, setPlans] = useState<Plans | null>(null)
  const [interval, setInterval] = useState<Interval>("month")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiRequest("/api/billing/plans")
      .then((result) => setPlans(result.data))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load plans"))
  }, [])

  const selectedPlan = DISPLAY_PRICES[interval]
  const monthlyEquivalent = useMemo(
    () => money(Math.round(DISPLAY_PRICES.year.amount / 12), "aed"),
    [],
  )

  async function checkout() {
    setSaving(true)
    setError("")
    if (!plans?.[interval]?.configured) {
      setError("PayPal billing is being configured. Please try again shortly.")
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

  const chosenPrice = money(selectedPlan.amount, selectedPlan.currency)

  return (
    <AppShell title="Subscription">
      <div className="mx-auto max-w-[1180px]">
        {Boolean(location.state?.subscriptionRequired) && (
          <div role="alert" className="mb-6 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm font-bold text-warning">
            You are not actively subscribed. Your workspace is view only. Choose a monthly or yearly plan to add records.
          </div>
        )}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.24em] text-warning">
              <span className="grid size-6 place-items-center rounded-full bg-warning-soft text-warning">
                <Icon name="shield" className="size-3" />
              </span>
              Sentinel Command Plan
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.04em] text-ink md:text-[28px]">
              One plan. Total operational visibility.
            </h2>
            <p className="mt-1.5 text-xs text-muted">
              Get secure owner access to every record, readiness signal, and operational workflow.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 xl:w-[355px]">
            {(["month", "year"] as const).map((value) => {
              const active = interval === value
              const price = DISPLAY_PRICES[value]
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setInterval(value)}
                  className={`relative min-h-[92px] rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-gold bg-navy text-white shadow-[0_0_0_2px_rgba(215,173,88,.35),0_8px_18px_rgba(19,38,45,.12)]"
                      : "border-line bg-surface text-ink hover:border-line-strong"
                  }`}
                >
                  <span className="block text-[9px] font-extrabold uppercase tracking-[0.13em]">
                    {value === "month" ? "1 month" : "1 year"}
                  </span>
                  <strong className="mt-2 block text-lg font-extrabold">
                    {money(price.amount, price.currency)}
                  </strong>
                  <span className={`mt-0.5 block text-[8px] ${active ? "text-white/60" : "text-muted"}`}>
                    {value === "month" ? "Billed every month" : `${monthlyEquivalent}/month · billed yearly`}
                  </span>
                  {active && (
                    <span className="absolute right-3 top-3 grid size-4 place-items-center rounded-full bg-gold text-[9px] font-black text-navy">✓</span>
                  )}
                  {value === "year" && !active && (
                    <span className="absolute right-2 top-3 rounded-full bg-positive-soft px-2 py-1 text-[7px] font-extrabold text-positive">
                      SAVE 10%
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.93fr)]">
          <section className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="relative overflow-hidden bg-navy px-7 py-7 text-white">
              <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-gold">
                    <Icon name="shield" className="size-3" /> Professional operations
                  </span>
                  <h3 className="mt-4 text-base font-extrabold">Sentinel Command</h3>
                  <p className="mt-2 text-[10px] text-white/55">
                    Full access for one K9 organization with secure owner and member accounts.
                  </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <strong className="text-3xl font-extrabold tracking-tight">{chosenPrice}</strong>
                  <span className="ml-1 text-[9px] text-white/55">/{interval}</span>
                  <p className="mt-1 text-[8px] text-white/45">
                    Billed {interval === "month" ? "monthly" : "yearly"} · cancel anytime
                  </p>
                </div>
              </div>
              <div className="absolute -right-6 -top-20 size-48 rounded-full bg-white/[0.025]" />
            </div>

            <div className="grid md:grid-cols-2">
              <div className="border-b border-line p-7 md:border-b-0 md:border-r">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-muted">Plan includes</p>
                <ul className="mt-5 space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3 text-[10px] leading-5 text-slate">
                      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-positive-soft text-[9px] font-black text-positive">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-7">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-muted">Account access</p>
                <div className="mt-5 flex items-center gap-4 rounded-xl border border-line bg-canvas/70 p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy text-gold">
                    <Icon name="shield" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold">Owner seat</p>
                    <p className="mt-1 text-[8px] text-muted">Billing, access, and full system control</p>
                  </div>
                  <span className="text-[8px] font-extrabold uppercase text-positive">1 included</span>
                </div>
                <p className="mt-4 flex items-center gap-2 text-[9px] text-muted">
                  <Icon name="users" className="size-3.5" /> Owner plus 3 member accounts included
                </p>
                <p className="mt-2 text-[9px] text-muted">Three member accounts are included.</p>
              </div>
            </div>
          </section>

          <div className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="border-b border-line px-5 py-4">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">Order summary</p>
                <h3 className="mt-2 text-sm font-extrabold">
                  Start your subscription
                </h3>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
                  <div>
                    <p className="text-xs font-extrabold">Sentinel Command</p>
                    <p className="mt-1 text-[9px] text-muted">{interval === "month" ? "Monthly" : "Yearly"} subscription</p>
                  </div>
                  <strong className="text-xs">{chosenPrice}</strong>
                </div>
                <div className="flex items-end justify-between py-5">
                  <div>
                    <p className="text-[10px] font-extrabold">Due today</p>
                    <p className="mt-1 text-[8px] text-muted">Taxes calculated at checkout</p>
                  </div>
                  <strong className="text-2xl font-extrabold">{chosenPrice}</strong>
                </div>
                {error && <p role="alert" className="mb-3 text-[10px] font-bold text-danger">{error}</p>}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void checkout()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3.5 text-xs font-bold text-white shadow-action transition hover:bg-navy-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Opening checkout…" : "Continue to secure checkout"} <span className="text-gold">→</span>
                </button>
                <p className="mt-3 flex items-center justify-center gap-2 text-[8px] text-muted">
                  <Icon name="shield" className="size-3 text-positive" /> Secure payment powered by PayPal
                </p>
              </div>
            </section>

            <section className="flex items-start gap-4 rounded-2xl border border-line bg-surface p-5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-info-soft text-info">
                <Icon name="reports" className="size-4" />
              </span>
              <div>
                <p className="text-[10px] font-extrabold">Simple, secure billing</p>
                <p className="mt-1 text-[8px] leading-4 text-muted">
                  Your plan renews automatically. Manage the subscription from your PayPal account.
                </p>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {[
            ["01", "Secure by design", "Encrypted payments and protected operational data"],
            ["02", "Ready in minutes", "Your workspace is available immediately after payment"],
            ["03", "Human support", "Direct assistance from our operations support team"],
          ].map(([number, title, copy]) => (
            <div key={number} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-canvas text-[8px] font-extrabold">{number}</span>
              <div>
                <p className="text-[9px] font-extrabold">{title}</p>
                <p className="mt-1 text-[8px] text-muted">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
