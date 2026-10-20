import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AppShell, Panel } from "../components/AppShell"
import SearchableSelect from "../components/SearchableSelect"
import { groomingApi } from "../lib/groomingApi"
import { k9Api } from "../lib/k9Api"
import type { GroomingFormValues } from "../types/grooming"
import { EMPTY_GROOMING_FORM } from "../types/grooming"
import type { K9Record } from "../types/k9"

const input = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-positive"
const label = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.1em] text-slate"

export default function GroomingFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [dogs, setDogs] = useState<K9Record[]>([])
  const [form, setForm] = useState<GroomingFormValues>(EMPTY_GROOMING_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    Promise.all([k9Api.list(), id ? groomingApi.get(id) : Promise.resolve(null)]).then(([roster, record]) => {
      if (!active) return
      setDogs(roster)
      if (id && !record) { setError("Grooming record not found."); return }
      if (record) setForm({ k9Id: record.k9Id, date: record.date.slice(0, 10), bathing: record.bathing, nails: record.nails, ears: record.ears, brushing: record.brushing, price: String(record.price) })
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load grooming form.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  function set<K extends keyof GroomingFormValues>(key: K, value: GroomingFormValues[K]) { setForm((current) => ({ ...current, [key]: value })) }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("")
    if (!form.k9Id) { setError("Select a K9 from the roster."); return }
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) { setError("Price must be zero or more."); return }
    setSaving(true)
    try { if (id) await groomingApi.update(id, form); else await groomingApi.create(form); navigate("/grooming", { replace: true }) }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save grooming record.") }
    finally { setSaving(false) }
  }
  const checks: { key: "bathing" | "nails" | "brushing"; label: string }[] = [{ key: "bathing", label: "Bathing" }, { key: "nails", label: "Nails" }, { key: "brushing", label: "Brushing" }]
  return <AppShell title={id ? "Edit Grooming" : "New Grooming"}><form onSubmit={(event) => void submit(event)} className="mx-auto max-w-3xl space-y-5">
    <div><Link to="/grooming" className="text-xs font-bold text-positive">← Grooming register</Link><p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.14em] text-positive">K9 care · grooming entry</p><h2 className="mt-1 text-2xl font-bold text-ink">{id ? "Update grooming record" : "Record grooming"}</h2><p className="mt-1 text-sm text-muted">Choose the care completed and record its cost.</p></div>
    <Panel className="space-y-5 p-5">{loading ? <p className="text-sm text-muted">Loading grooming form…</p> : <>
      <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="grooming-date" className={label}>Date *</label><input id="grooming-date" type="date" required className={input} value={form.date} onChange={(event) => set("date", event.target.value)} /></div><div><label htmlFor="grooming-k9" className={label}>K9 *</label><SearchableSelect id="grooming-k9" required className={input} value={form.k9Id} onChange={(value) => set("k9Id", value)} placeholder="Select or search for a K9" options={dogs.map((dog) => ({ value: dog.id, label: `${dog.dogName}${dog.nickName ? ` (${dog.nickName})` : ""}` }))} /></div></div>
      <fieldset><legend className={label}>Care completed</legend><div className="grid gap-3 sm:grid-cols-3">{checks.map(({ key, label: title }) => <label key={key} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-positive ${form[key] ? "border-positive bg-positive-soft text-positive ring-1 ring-positive/30" : "border-line bg-surface text-ink hover:border-positive/50"}`}><input type="checkbox" checked={form[key]} onChange={(event) => set(key, event.target.checked)} className="size-4 accent-emerald-700" />{title}</label>)}</div></fieldset>
      <div><label htmlFor="grooming-ears" className={label}>Ears / ear-care notes</label><textarea id="grooming-ears" rows={3} maxLength={2000} className={`${input} resize-y`} value={form.ears} onChange={(event) => set("ears", event.target.value)} placeholder="Enter ear care details or notes…" /></div>
      <div className="max-w-xs"><label htmlFor="grooming-price" className={label}>Price (AED) *</label><div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">AED</span><input id="grooming-price" type="number" min="0" step="0.01" required className={`${input} appearance-none pl-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} value={form.price} onChange={(event) => set("price", event.target.value)} /></div></div>
    </>}
      {!loading && dogs.length === 0 && <p className="text-sm text-warning">Add a K9 to the roster before recording grooming.</p>}
      {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2"><Link to="/grooming" className="button-secondary">Cancel</Link><button type="submit" disabled={loading || saving || dogs.length === 0} className="button-primary disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving…" : id ? "Save changes" : "Save grooming"}</button></div>
    </Panel>
  </form></AppShell>
}