import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AppShell, Panel } from "../components/AppShell"
import { weightsApi } from "../lib/weightsApi"
import type { WeightRecord } from "../types/weights"

const inputClass = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-positive focus-visible:ring-2 focus-visible:ring-positive/30"

export default function WeightFormPage() {
  const { id = "" } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<WeightRecord | null>(null)
  const [date, setDate] = useState("")
  const [weight, setWeight] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    void weightsApi.get(id).then((result) => {
      if (!active) return
      setRecord(result); setDate(result.date.slice(0, 10)); setWeight(String(result.weight))
    }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not load weight record.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("")
    try { await weightsApi.update(id, { date, weight: Number(weight) }); navigate("/weights", { replace: true }) }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update weight record.") }
    finally { setSaving(false) }
  }

  return <AppShell title="Edit K9 Weight"><form onSubmit={(event) => void submit(event)} className="mx-auto max-w-3xl space-y-5">
    <div><Link to="/weights" className="rounded px-1 py-1 text-xs font-bold text-positive hover:bg-positive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-positive">← K9 Weights</Link><p className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-positive">K9 care · weight record</p><h2 className="mt-1 font-rajdhani text-3xl font-bold text-ink">Update weight</h2><p className="mt-1 text-sm text-muted">{record?.dog_name ?? "Edit saved weight details"}</p></div>
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
    {loading ? <Panel className="p-8 text-center text-sm text-muted">Loading weight record…</Panel> : record ? <>
      <Panel className="grid gap-4 p-5 md:grid-cols-2">
        <div><label htmlFor="record-date" className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate">Date</label><input id="record-date" required type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} /></div>
        <div><label htmlFor="record-weight" className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate">Weight (kg)</label><input id="record-weight" required type="number" min="0.01" max="1000" step="any" className={inputClass} value={weight} onChange={(event) => setWeight(event.target.value)} /></div>
        <div className="flex items-end text-sm font-semibold text-muted">Dog: {record.dog_name}</div>
      </Panel>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Link to="/weights" className="button-secondary">Cancel</Link><button type="submit" disabled={saving} className="button-primary">{saving ? "Saving…" : "Save changes"}</button></div>
    </> : <Panel className="p-8 text-center text-sm text-muted">Weight record not found.</Panel>}
  </form></AppShell>
}