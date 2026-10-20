import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AppShell, Panel } from "../components/AppShell"
import SearchableSelect from "../components/SearchableSelect"
import { carUsageApi } from "../lib/carUsageApi"
import { k9Api } from "../lib/k9Api"
import type { CarUsageFormValues } from "../types/carUsage"
import { EMPTY_CAR_USAGE_FORM } from "../types/carUsage"
import type { K9Record } from "../types/k9"

const input = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-positive"
const label = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.1em] text-slate"

export default function CarUsageFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [dogs, setDogs] = useState<K9Record[]>([])
  const [form, setForm] = useState<CarUsageFormValues>(EMPTY_CAR_USAGE_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    Promise.all([k9Api.list(), id ? carUsageApi.get(id) : Promise.resolve(null)]).then(([roster, record]) => {
      if (!active) return
      setDogs(roster)
      if (id && !record) { setError("Car usage record not found."); return }
      if (record) setForm({ k9Id: record.k9Id, date: record.date.slice(0, 10), driver: record.driver, timeIn: record.timeIn, kmStart: String(record.kmStart), timeOut: record.timeOut, kmEnd: String(record.kmEnd) })
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load car usage form.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  function set<K extends keyof CarUsageFormValues>(key: K, value: CarUsageFormValues[K]) { setForm((current) => ({ ...current, [key]: value })) }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("")
    if (!form.k9Id) { setError("Select a K9 from the roster."); return }
    if (!form.driver.trim()) { setError("Enter the driver name."); return }
    const start = Number(form.kmStart), end = Number(form.kmEnd)
    if (!Number.isFinite(start) || start < 0 || !Number.isFinite(end) || end < start) { setError("KM end must be greater than or equal to KM start."); return }
    setSaving(true)
    try { if (id) await carUsageApi.update(id, form); else await carUsageApi.create(form); navigate("/car-usage", { replace: true }) }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save car usage record.") }
    finally { setSaving(false) }
  }
  return <AppShell title={id ? "Edit Car Usage" : "New Car Usage"}><form onSubmit={(event) => void submit(event)} className="mx-auto max-w-3xl space-y-5">
    <div><Link to="/car-usage" className="text-xs font-bold text-positive">← Car Usage</Link><p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.14em] text-positive">Fleet · trip entry</p><h2 className="mt-1 text-2xl font-bold text-ink">{id ? "Update car usage" : "Record car usage"}</h2><p className="mt-1 text-sm text-muted">Enter trip timing and odometer readings.</p></div>
    <Panel className="grid gap-4 p-5 md:grid-cols-2">{loading ? <p className="text-sm text-muted">Loading car usage form…</p> : <>
      <div><label htmlFor="car-usage-date" className={label}>Date *</label><input id="car-usage-date" type="date" required className={input} value={form.date} onChange={(event) => set("date", event.target.value)} /></div>
      <div><label htmlFor="car-usage-driver" className={label}>Driver *</label><input id="car-usage-driver" required maxLength={200} className={input} value={form.driver} onChange={(event) => set("driver", event.target.value)} placeholder="Driver name" /></div>
      <div><label htmlFor="car-usage-k9" className={label}>K9 *</label><SearchableSelect id="car-usage-k9" required className={input} value={form.k9Id} onChange={(value) => set("k9Id", value)} placeholder="Select or search for a K9" options={dogs.map((dog) => ({ value: dog.id, label: `${dog.dogName}${dog.nickName ? ` (${dog.nickName})` : ""}` }))} /></div>
      <div><label htmlFor="car-usage-time-in" className={label}>Time in *</label><input id="car-usage-time-in" type="time" required className={input} value={form.timeIn} onChange={(event) => set("timeIn", event.target.value)} /></div>
      <div><label htmlFor="car-usage-km-start" className={label}>KM start *</label><input id="car-usage-km-start" type="number" min="0" step="0.1" required className={input} value={form.kmStart} onChange={(event) => set("kmStart", event.target.value)} /></div>
      <div><label htmlFor="car-usage-time-out" className={label}>Time out *</label><input id="car-usage-time-out" type="time" required className={input} value={form.timeOut} onChange={(event) => set("timeOut", event.target.value)} /></div>
      <div><label htmlFor="car-usage-km-end" className={label}>KM end *</label><input id="car-usage-km-end" type="number" min={form.kmStart || "0"} step="0.1" required className={input} value={form.kmEnd} onChange={(event) => set("kmEnd", event.target.value)} /></div>
    </>}
      {!loading && dogs.length === 0 && <p className="text-sm text-warning md:col-span-2">Add a K9 to the roster before recording car usage.</p>}
      {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger md:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 md:col-span-2"><Link to="/car-usage" className="button-secondary">Cancel</Link><button type="submit" disabled={loading || saving || dogs.length === 0} className="button-primary disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving…" : id ? "Save changes" : "Save car usage"}</button></div>
    </Panel>
  </form></AppShell>
}