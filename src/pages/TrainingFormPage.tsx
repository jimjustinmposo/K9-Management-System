git simport { useEffect, useMemo, useState } from "react"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import { AppShell, Panel } from "../components/AppShell"
import { handlersApi } from "../lib/handlersApi"
import { k9Api } from "../lib/k9Api"
import { trainingApi } from "../lib/trainingApi"
import type { Handler } from "../types/handlers"
import type { K9Record } from "../types/k9"
import { EMPTY_TRAINING_FORM, isTrainingDiscipline, TRAINING_DISCIPLINES, type TrainingDiscipline, type TrainingFormValues } from "../types/training"

const inputClass = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-positive"
const labelClass = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate"

export default function TrainingFormPage() {
  const { discipline: raw, id } = useParams<{ discipline: string; id: string }>()
  const navigate = useNavigate()
  const valid = isTrainingDiscipline(raw)
  const definition = TRAINING_DISCIPLINES.find((item) => item.id === raw)
  const discipline = raw as TrainingDiscipline
  const [form, setForm] = useState<TrainingFormValues>(EMPTY_TRAINING_FORM)
  const [dogs, setDogs] = useState<K9Record[]>([])
  const [handlers, setHandlers] = useState<Handler[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [dogSearch, setDogSearch] = useState("")
  const [dogMenuOpen, setDogMenuOpen] = useState(false)

  const selectedDog = dogs.find((dog) => dog.id === form.k9_id)
  const filteredDogs = useMemo(() => {
    const query = dogSearch.trim().toLocaleLowerCase()
    return dogs.filter((dog) => `${dog.dogName} ${dog.nickName ?? ""}`.toLocaleLowerCase().includes(query))
  }, [dogs, dogSearch])

  useEffect(() => {
    if (!valid || !raw) return
    let active = true
    void Promise.all([k9Api.list(), handlersApi.list(), id ? trainingApi.get(discipline, id) : Promise.resolve(null)])
      .then(([roster, team, record]) => {
        if (!active) return
        setDogs(roster); setHandlers(team)
        if (record) setForm({ k9_id: record.k9_id, handler_id: record.handler_id, session_date: record.session_date.slice(0, 10), note: record.note })
      }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not load training form.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [discipline, id, raw, valid])

  function set<K extends keyof TrainingFormValues>(key: K, value: TrainingFormValues[K]) { setForm((current) => ({ ...current, [key]: value })) }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("")
    try {
      if (id) await trainingApi.update(discipline, id, form)
      else await trainingApi.create(discipline, form)
      navigate(`/training/${raw}`, { replace: true })
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save training record.") }
    finally { setSaving(false) }
  }

  if (!valid || !definition) return <Navigate to="/training" replace />
  if (loading) return <AppShell title="Training"><Panel className="p-8 text-center text-sm text-muted">Loading training form…</Panel></AppShell>
  return <AppShell title={id ? "Edit Training Session" : "Add Training Session"}><form onSubmit={(event) => void submit(event)} className="mx-auto max-w-3xl space-y-5">
    <div><Link to={`/training/${raw}`} className="text-xs font-bold text-positive">← {definition.name} register</Link><p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.16em] text-positive">K9 training · session record</p><h2 className="mt-1 font-rajdhani text-3xl font-bold text-ink">{id ? "Update training session" : `Add ${definition.name} session`}</h2><p className="mt-1 text-sm text-muted">Select a registered dog and handler to link this entry to their rosters.</p></div>
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
    <Panel className="grid gap-4 p-5 md:grid-cols-2">
      <div><label htmlFor="session-date" className={labelClass}>Date <span className="text-danger">*</span></label><input id="session-date" type="date" required className={inputClass} value={form.session_date} onChange={(event) => set("session_date", event.target.value)} /></div>
      <div className="relative"><label htmlFor="dog" className={labelClass}>Dog name <span className="text-danger">*</span></label><input id="dog" role="combobox" aria-autocomplete="list" aria-expanded={dogMenuOpen} aria-controls="dog-options" autoComplete="off" required value={dogMenuOpen ? dogSearch : selectedDog ? `${selectedDog.dogName}${selectedDog.nickName ? ` “${selectedDog.nickName}”` : ""}` : ""} placeholder="Select or search for a K9" className={inputClass} onFocus={() => { setDogSearch(""); setDogMenuOpen(true) }} onChange={(event) => { setDogSearch(event.target.value); setDogMenuOpen(true); if (form.k9_id) set("k9_id", "") }} onKeyDown={(event) => { if (event.key === "Escape") setDogMenuOpen(false); if (event.key === "ArrowDown" && filteredDogs.length) { event.preventDefault(); document.getElementById(`dog-option-${filteredDogs[0].id}`)?.focus() } }} /><input type="hidden" required value={form.k9_id} />{dogMenuOpen && <ul id="dog-options" role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lg">{filteredDogs.length ? filteredDogs.map((dog) => <li key={dog.id} role="option" aria-selected={dog.id === form.k9_id}><button id={`dog-option-${dog.id}`} type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-canvas focus:bg-canvas focus:outline-none" onClick={() => { set("k9_id", dog.id); setDogSearch(""); setDogMenuOpen(false) }}>{dog.dogName}{dog.nickName ? ` “${dog.nickName}”` : ""}</button></li>) : <li className="px-3 py-2 text-sm text-muted">No K9s match that search.</li>}</ul>}{dogs.length === 0 && <Link to="/k9-roster/new" className="mt-1 inline-block text-xs font-bold text-positive">Add a K9 to the roster</Link>}</div>
      <div><label htmlFor="handler" className={labelClass}>Handler name <span className="text-danger">*</span></label><select id="handler" required className={inputClass} value={form.handler_id} onChange={(event) => set("handler_id", event.target.value)}><option value="">Select a handler</option>{handlers.map((handler) => <option key={handler.id} value={handler.id}>{handler.full_name}</option>)}</select>{handlers.length === 0 && <Link to="/handlers/new" className="mt-1 inline-block text-xs font-bold text-positive">Add a handler to the directory</Link>}</div>
      <div className="md:col-span-2"><label htmlFor="note" className={labelClass}>Note</label><textarea id="note" rows={5} maxLength={4000} className={inputClass} value={form.note} onChange={(event) => set("note", event.target.value)} placeholder="Session observations or notes…" /></div>
    </Panel>
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Link to={`/training/${raw}`} className="rounded-xl border border-line bg-surface px-6 py-3 text-center text-sm font-bold text-slate hover:bg-canvas">Cancel</Link><button type="submit" disabled={saving || dogs.length === 0 || handlers.length === 0} className="rounded-xl bg-navy px-8 py-3 text-sm font-bold text-white shadow-action hover:bg-navy-light disabled:opacity-60">{saving ? "Saving…" : id ? "Save changes" : "Create session"}</button></div>
  </form></AppShell>
}