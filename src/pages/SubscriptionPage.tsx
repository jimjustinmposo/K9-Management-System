import { useState } from "react"
import { useLocation } from "react-router-dom"
import { AppShell, Icon } from "../components/AppShell"

type Interval = "month" | "year"

const prices = {
  month: { amount: "$41", detail: "Billed every month" },
  year: { amount: "$443", detail: "Billed yearly" },
} satisfies Record<Interval, { amount: string; detail: string }>

const benefits = [
  "Complete K9 profiles and operational records",
  "Training, medical, and certification tracking",
  "Deployment history and readiness analytics",
  "Secure reports and data exports",
]

export default function SubscriptionPage() {
  const location = useLocation()
  const [interval, setInterval] = useState<Interval>("month")
  const selected = prices[interval]

  return (
    <AppShell title="Subscription">
      <div className="mx-auto max-w-[1180px]">
        {Boolean(location.state?.subscriptionRequired) && (
          <div role="alert" className="mb-6 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm font-bold text-warning">
            You are not actively subscribed. Your workspace is view only.
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
                  <strong className="mt-2 block text-lg font-extrabold">{prices[value].amount}</strong>
                  <span className={`mt-0.5 block text-[8px] ${active ? "text-white/60" : "text-muted"}`}>
                    {prices[value].detail}
                    {value === "year" && (
                      <strong className="ml-1 font-extrabold text-positive">10% discount</strong>
                    )}
                  </span>
                  {active && (
                    <span className="absolute right-3 top-3 grid size-4 place-items-center rounded-full bg-gold text-[9px] font-black text-navy">✓</span>
                  )}
                  {value === "year" && !active && (
                    <span className="absolute right-2 top-3 rounded-full bg-positive-soft px-2 py-1 text-[7px] font-extrabold text-positive">SAVE 10%</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.93fr)]">
          <section className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="bg-navy px-7 py-7 text-white">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-gold">
                    <Icon name="shield" className="size-3" /> Professional operations
                  </span>
                  <h3 className="mt-4 text-base font-extrabold">Sentinel Command</h3>
                </div>
                <div className="text-right">
                  <strong className="text-3xl font-extrabold tracking-tight">{selected.amount}</strong>
                  <span className="ml-1 text-[9px] text-white/55">/{interval}</span>
                </div>
              </div>
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
                  <div>
                    <p className="text-[11px] font-extrabold">Owner seat</p>
                    <p className="mt-1 text-[8px] text-muted">Owner plus 3 member accounts included</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">Order summary</p>
              <h3 className="mt-2 text-sm font-extrabold">Subscription unavailable</h3>
            </div>
            <div className="p-5">
              <div className="flex items-end justify-between border-b border-line pb-5">
                <div>
                  <p className="text-xs font-extrabold">Sentinel Command</p>
                  <p className="mt-1 text-[9px] text-muted">{interval === "month" ? "Monthly" : "Yearly"} subscription</p>
                </div>
                <div className="text-right">
                  <strong className="text-xl font-extrabold">{selected.amount}</strong>
                  {interval === "year" && (
                    <strong className="mt-1 block text-[9px] font-extrabold text-positive">
                      10% discount
                    </strong>
                  )}
                </div>
              </div>
              <p role="status" className="py-5 text-[10px] font-bold leading-5 text-warning">
                Online payments are temporarily unavailable while billing is updated.
              </p>
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-navy px-4 py-3.5 text-xs font-bold text-white opacity-50"
              >
                Payments temporarily unavailable
              </button>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
