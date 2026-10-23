import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AppShell, Panel } from "../components/AppShell"
import { carUsageApi } from "../lib/carUsageApi"
import type { CarUsageFormValues } from "../types/carUsage"
import { EMPTY_CAR_USAGE_FORM } from "../types/carUsage"

const input = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-positive"
const label = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.1em] text-slate"

export default function CarUsageFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<CarUsageFormValues>(EMPTY_CAR_USAGE_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true;
    (id ? carUsageApi.get(id) : Promise.resolve(null)).then((record) => {
      if (!active) return
      if (id && !record) { setError("Car usage record not found."); return }
      if (record) setForm({ notes: record.notes, date: record.date.slice(0, 10), driver: record.driver, timeIn: record.timeIn, kmStart: String(record.kmStart), timeOut: record.timeOut, kmEnd: String(record.kmEnd) })
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load car usage form.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  function set<K extends keyof CarUsageFormValues>(key: K, value: CarUsageFormValues[K]) { setForm((current) => ({ ...current, [key]: value })) }
  const kmStart = Number(form.kmStart)
  const kmEnd = Number(form.kmEnd)
  const kmUsed = form.kmStart !== "" && form.kmEnd !== "" && Number.isFinite(kmStart) && Number.isFinite(kmEnd) && kmEnd >= kmStart
    ? kmEnd - kmStart
    : null
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("")
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
      <div><label htmlFor="car-usage-notes" className={label}>Notes</label><textarea id="car-usage-notes" rows={3} maxLength={2000} className={`${input} resize-y`} value={form.notes} onChange={(event) => set("notes", event.target.value)} placeholder="Trip notes…" /></div>
      <div><label htmlFor="car-usage-time-in" className={label}>Time in *</label><input id="car-usage-time-in" type="time" required className={input} value={form.timeIn} onChange={(event) => set("timeIn", event.target.value)} /></div>
      <div><label htmlFor="car-usage-km-start" className={label}>KM start *</label><input id="car-usage-km-start" type="number" min="0" step="0.1" required className={input} value={form.kmStart} onChange={(event) => set("kmStart", event.target.value)} /></div>
      <div><label htmlFor="car-usage-time-out" className={label}>Time out *</label><input id="car-usage-time-out" type="time" required className={input} value={form.timeOut} onChange={(event) => set("timeOut", event.target.value)} /></div>
      <div><label htmlFor="car-usage-km-end" className={label}>KM end *</label><input id="car-usage-km-end" type="number" min={form.kmStart || "0"} step="0.1" required className={input} value={form.kmEnd} onChange={(event) => set("kmEnd", event.target.value)} /></div>
      <div><label htmlFor="car-usage-km-used" className={label}>KM used (calculated)</label><output id="car-usage-km-used" aria-live="polite" className={`${input} flex items-center bg-canvas`}>
        {kmUsed === null ? "Enter valid KM start and KM end" : `${kmUsed.toLocaleString()} km`}
      </output></div>
    </>}
      {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger md:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 md:col-span-2"><Link to="/car-usage" className="button-secondary">Cancel</Link><button type="submit" disabled={loading || saving} className="button-primary disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving…" : id ? "Save changes" : "Save car usage"}</button></div>
    </Panel>
  </form></AppShell>
}