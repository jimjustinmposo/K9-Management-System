import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AppShell, Panel } from "../components/AppShell"
import SearchableSelect from "../components/SearchableSelect"
import { inSeasonApi } from "../lib/inSeasonApi"
import { k9Api } from "../lib/k9Api"
import type { K9Record } from "../types/k9"
import type { SeasonFormValues } from "../types/inSeason"

const input = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-positive"
const label = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate"

export default function InSeasonFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [dogs, setDogs] = useState<K9Record[]>([])
  const [form, setForm] = useState<SeasonFormValues>({ k9Id: "", startDate: new Date().toISOString().slice(0, 10), endDate: "", notes: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    Promise.all([k9Api.list(), id ? inSeasonApi.get(id) : Promise.resolve(null)]).then(([roster, record]) => {
      if (!active) return
      setDogs(roster.filter((dog) => dog.sex === "Female"))
      if (id && !record) { setError("Season record not found."); return }
      if (record) setForm({ k9Id: record.k9Id, startDate: record.startDate, endDate: record.endDate, notes: record.notes })
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load season form.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("")
    if (!form.k9Id) { setError("Select a female K9 from the roster."); return }
    if (form.endDate && form.endDate < form.startDate) { setError("End date must be on or after the start date."); return }
    setSaving(true)
    try { if (id) await inSeasonApi.update(id, form); else await inSeasonApi.create(form); navigate("/in-season", { replace: true }) }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save season record.") }
    finally { setSaving(false) }
  }

  return <AppShell title={id ? "Edit Season" : "New Season"}>
    <form onSubmit={(event) => void submit(event)} className="mx-auto max-w-3xl space-y-5">
      <Panel className="space-y-4 p-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Heat cycle details</p>
        {loading ? <p className="text-sm text-muted">Loading…</p> : <>
          <div><label htmlFor="season-k9" className={label}>Female K9 *</label><SearchableSelect id="season-k9" value={form.k9Id} onChange={(k9Id) => setForm((current) => ({ ...current, k9Id }))} options={dogs.map((dog) => ({ value: dog.id, label: `${dog.dogName}${dog.nickName ? ` (${dog.nickName})` : ""}` }))} className={input} required placeholder="Select female K9…" /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="season-start" className={label}>Heat start date *</label><input id="season-start" type="date" required className={input} value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} /></div><div><label htmlFor="season-end" className={label}>Heat end date</label><input id="season-end" type="date" min={form.startDate} className={input} value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} /></div></div>
          <div><label htmlFor="season-notes" className={label}>Notes</label><textarea id="season-notes" rows={4} className={`${input} resize-y`} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></div>
          {dogs.length === 0 && <p className="text-sm text-warning">No female K9s are currently identified in the roster.</p>}
        </>}
        {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2"><Link to="/in-season" className="button-secondary">Cancel</Link><button type="submit" disabled={loading || saving || dogs.length === 0} className="button-primary">{saving ? "Saving…" : id ? "Save changes" : "Start tracking"}</button></div>
      </Panel>
    </form>
  </AppShell>
}