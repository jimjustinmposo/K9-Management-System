import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AppShell, Panel } from "../components/AppShell"
import { trainingApi } from "../lib/trainingApi"
import { TRAINING_DISCIPLINES } from "../types/training"

export default function TrainingPage() {
  const [counts, setCounts] = useState<Record<string, number | null>>({})
  useEffect(() => {
    let active = true
    void Promise.all(TRAINING_DISCIPLINES.map(async ({ id }) => {
      try { return [id, await trainingApi.count(id)] as const }
      catch { return [id, null] as const }
    })).then((entries) => { if (active) setCounts(Object.fromEntries(entries)) })
    return () => { active = false }
  }, [])
  return <AppShell title="Training & Grooming"><div className="mx-auto max-w-6xl space-y-6">
    <div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-positive">K9 operations · care</p><h2 className="mt-1 text-xl font-semibold text-ink">Training & Grooming</h2><p className="mt-1 text-sm text-muted">Manage training sessions and grooming records for your K9s.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{TRAINING_DISCIPLINES.map((discipline) => <Link key={discipline.id} to={`/training/${discipline.id}`} className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><Panel className="h-full p-5 transition hover:border-positive/40 group-active:scale-[.99]"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-positive">Training log</p><h3 className="mt-2 text-lg font-bold text-ink group-hover:text-positive">{discipline.name}</h3><p className="mt-1 text-sm text-muted">{discipline.description}</p></div><span className="rounded-full bg-positive-soft px-3 py-1 text-xs font-bold text-positive">{counts[discipline.id] ?? "—"} entries</span></div><p className="mt-5 text-xs font-bold text-positive">Open register →</p></Panel></Link>)}<Link to="/grooming" className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><Panel className="h-full p-5 transition hover:border-positive/40 group-active:scale-[.99]"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-positive">K9 care</p><h3 className="mt-2 text-lg font-bold text-ink group-hover:text-positive">Grooming</h3><p className="mt-1 text-sm text-muted">Track bathing, nails, ear care, brushing, and price.</p></div><span className="rounded-full bg-positive-soft px-3 py-1 text-xs font-bold text-positive">Care log</span></div><p className="mt-5 text-xs font-bold text-positive">Open register →</p></Panel></Link></div>
  </div></AppShell>
}
