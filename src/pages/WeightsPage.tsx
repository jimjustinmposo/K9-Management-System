import { useCallback, useEffect, useMemo, useState } from "react"
import { useLatestLoad } from "../lib/useLatestLoad"
import { Link, useNavigate } from "react-router-dom"
import { AppShell, Panel, PanelHeader } from "../components/AppShell"
import Pagination from "../components/Pagination"
import { useAuth } from "../lib/auth"
import { k9Api } from "../lib/k9Api"
import { weightsApi } from "../lib/weightsApi"
import type { K9Record } from "../types/k9"
import type { WeightInput, WeightRecord } from "../types/weights"

const PAGE_SIZE = 10
const inputClass = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-normal text-ink outline-none focus:border-positive focus-visible:ring-2 focus-visible:ring-positive/30"

type SavedWeightDraft = { selected: string[]; entries: Record<string, WeightInput>; date: string }

function readDraft(key: string): SavedWeightDraft | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null")
    if (!value || typeof value !== "object") return null
    const selected = Array.isArray(value.selected) ? value.selected.filter((id: unknown): id is string => typeof id === "string") : []
    const entries = value.entries && typeof value.entries === "object" ? value.entries as Record<string, WeightInput> : {}
    const date = typeof value.date === "string" ? value.date : new Date().toISOString().slice(0, 10)
    return { selected, entries, date }
  } catch { return null }
}

export default function WeightsPage() {
  const { session, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const workspaceId = session?.workspace.id ?? ""
  const storageKey = `sentinel-k9-weight-draft-v2-${workspaceId}`
  const legacyStorageKey = `sentinel-k9-weight-selected-v1-${workspaceId}`
  const [draftReadyKey, setDraftReadyKey] = useState("")
  const [dogs, setDogs] = useState<K9Record[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [entries, setEntries] = useState<Record<string, WeightInput>>({})
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [dogSearch, setDogSearch] = useState("")
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<WeightRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    if (authLoading || !workspaceId) return
    setDraftReadyKey("")
    const saved = readDraft(storageKey)
    if (saved) {
      setSelected(saved.selected)
      setEntries(saved.entries)
      setDate(saved.date)
    } else {
      // Read the earlier ID-only storage format and upgrade it without losing selected dogs.
      try {
        const oldSelected = JSON.parse(localStorage.getItem(legacyStorageKey) ?? "[]")
        if (Array.isArray(oldSelected)) {
          const selectedIds = oldSelected.filter((id): id is string => typeof id === "string")
          setSelected(selectedIds)
          setEntries(Object.fromEntries(selectedIds.map((id) => [id, { dog_id: id, nickname: "", weight: "" }])))
        }
      } catch { /* Start with an empty draft if browser storage is unavailable or malformed. */ }
    }
    setDraftReadyKey(storageKey)
  }, [authLoading, legacyStorageKey, storageKey, workspaceId])
  useEffect(() => {
    if (draftReadyKey !== storageKey) return
    try { localStorage.setItem(storageKey, JSON.stringify({ selected, entries, date } satisfies SavedWeightDraft)) } catch { /* Keep the current draft in memory if storage is unavailable. */ }
  }, [date, draftReadyKey, entries, selected, storageKey])
  useEffect(() => { void k9Api.list().then(setDogs).catch((err) => setError(err instanceof Error ? err.message : "Could not load K9 roster.")) }, [])

  const read = useCallback(() => weightsApi.page(search, PAGE_SIZE, (page - 1) * PAGE_SIZE), [page, search])
  const accept = useCallback((result: { data: WeightRecord[]; total: number }) => { setItems(result.data); setTotal(result.total) }, [])
  const load = useLatestLoad(read, accept, setLoading, setError, "Could not load weight records.", search)
  useEffect(() => { setPage(1) }, [search])

  const availableDogs = useMemo(() => dogs.filter((dog) => `${dog.dogName} ${dog.nickName}`.toLowerCase().includes(dogSearch.trim().toLowerCase())), [dogs, dogSearch])
  function toggleDog(dog: K9Record) {
    if (selected.includes(dog.id)) {
      setSelected((current) => current.filter((id) => id !== dog.id))
      setEntries((current) => { const next = { ...current }; delete next[dog.id]; return next })
    } else {
      setSelected((current) => [...current, dog.id])
      setEntries((current) => current[dog.id] ? current : { ...current, [dog.id]: { dog_id: dog.id, nickname: dog.nickName, weight: "" } })
    }
  }
  function updateEntry(id: string, key: "weight", value: string) {
    setEntries((current) => ({ ...current, [id]: { ...current[id], [key]: value } }))
  }
  function clearList() {
    setSelected([])
    setEntries({})
    setNotice("Selected dogs cleared.")
    setError("")
  }
  async function saveAll(event: React.FormEvent) {
    event.preventDefault(); setError(""); setNotice("")
    const batch = selected.map((id) => entries[id]).filter((entry): entry is WeightInput => Boolean(entry))
    if (!date || batch.length === 0 || batch.some((entry) => !entry.weight || !Number.isFinite(Number(entry.weight)) || Number(entry.weight) <= 0)) {
      setError("Choose at least one dog and enter a valid weight in kg for each selected dog."); return
    }
    setSaving(true)
    try {
      await weightsApi.create(date, batch)
      setEntries((current) => Object.fromEntries(Object.entries(current).map(([id, entry]) => [id, selected.includes(id) ? { ...entry, weight: "" } : entry])))
      setNotice(`Saved ${batch.length} weight record${batch.length === 1 ? "" : "s"}. Selected dogs are still remembered.`)
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save weight records.") }
    finally { setSaving(false) }
  }
  async function remove(record: WeightRecord) {
    if (!window.confirm(`Delete the weight record for ${record.dog_name}?`)) return
    try { await weightsApi.remove(record.id); setNotice("Weight record deleted."); await load() }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete weight record.") }
  }

  return <AppShell title="K9 Weights"><div className="mx-auto max-w-6xl space-y-5">
    <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-positive">K9 care · weight register</p><h2 className="mt-1 font-rajdhani text-3xl font-bold text-ink">K9 Weights</h2><p className="mt-1 text-sm text-muted">Record weights in kilograms. Selected dogs are remembered on this device, including after logout.</p></div>
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-positive/30 bg-positive/5 p-3 text-sm text-positive">{notice}</p>}
    <Panel><PanelHeader eyebrow="Batch entry" title="Record weights" />
      <form onSubmit={(event) => void saveAll(event)} className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]"><div><label htmlFor="weight-dog-search" className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate">Find dogs</label><input id="weight-dog-search" className={inputClass} value={dogSearch} onChange={(event) => setDogSearch(event.target.value)} placeholder="Search name or nickname" /></div><div><label htmlFor="weight-date" className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate">Date</label><input id="weight-date" required type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} /></div></div>
        <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">{availableDogs.map((dog) => { const active = selected.includes(dog.id); return <button key={dog.id} type="button" aria-pressed={active} onClick={() => toggleDog(dog)} className={`rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${active ? "border-gold bg-gold/10 text-ink ring-1 ring-gold/50" : "border-line bg-surface text-ink hover:border-positive/50 hover:bg-positive/5"}`}><span className="flex items-center justify-between gap-2"><span className="font-bold">{dog.dogName}</span><span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${active ? "bg-gold text-navy" : "bg-canvas text-muted"}`}>{active ? "Selected" : "Select"}</span></span><span className="mt-1 block text-xs text-muted">{dog.nickName || "No nickname"}</span></button> })}{availableDogs.length === 0 && <p className="col-span-full rounded-lg border border-dashed border-line p-4 text-sm text-muted">{dogs.length ? "No dogs match that search." : "No K9 records found."}</p>}</div>
        {selected.length > 0 && <div className="space-y-3"><h3 className="text-sm font-bold text-ink">Selected dogs ({selected.length})</h3>{selected.map((id) => { const dog = dogs.find((item) => item.id === id); const entry = entries[id]; if (!dog || !entry) return null; return <div key={id} className="grid gap-3 rounded-xl border border-gold/35 bg-gold/5 p-4 sm:grid-cols-[1fr_180px] sm:items-end"><div><p className="font-bold text-ink">{dog.nickName || "No nickname"}</p><p className="text-xs text-muted">{dog.dogName}</p></div><div><label htmlFor={`weight-${id}`} className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate">Weight (kg)</label><input id={`weight-${id}`} required type="number" min="0.01" max="1000" step="any" className={inputClass} value={entry.weight} onChange={(event) => updateEntry(id, "weight", event.target.value)} placeholder="e.g. 28.5" /></div></div> })}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">Selected dogs are saved in this browser for this workspace and remain selected after logout or refresh.</p><div className="flex gap-2"><button type="button" disabled={saving || selected.length === 0} onClick={clearList} className="button-secondary">Clear list</button><button type="submit" disabled={saving || selected.length === 0} className="min-h-9 rounded-lg border border-positive/70 bg-positive px-4 py-2 text-xs font-semibold text-white shadow-filter transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-positive focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50"><span aria-hidden="true" className="text-base font-medium leading-none text-gold">+</span><span>{saving ? "Saving…" : `Save all weights${selected.length ? ` (${selected.length})` : ""}`}</span></button></div></div>
      </form>
    </Panel>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-positive">History</p><h2 className="text-base font-semibold text-ink">Saved weight records</h2></div><input aria-label="Search weight records" type="search" className={`${inputClass} md:max-w-sm`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dog or nickname" /></div>
    <Panel><PanelHeader eyebrow="Weight history" title={`${total} record${total === 1 ? "" : "s"}`} />
      {loading ? <p className="p-8 text-center text-sm text-muted">Loading weight records…</p> : total === 0 ? <div className="p-10 text-center"><p className="text-sm font-bold text-ink">{search ? "No matching records" : "No weight records yet"}</p><p className="mt-1 text-xs text-muted">{search ? "Try another search." : "Choose dogs above and save their weights."}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="bg-canvas text-[10px] uppercase tracking-wider text-muted"><tr>{["Date", "Dog", "Nickname", "Weight", "Difference", "Actions"].map((label) => <th key={label} className="px-5 py-3">{label === "Actions" ? <span className="sr-only">Actions</span> : label}</th>)}</tr></thead><tbody className="divide-y divide-line">{items.map((item) => <tr key={item.id}><td className="whitespace-nowrap px-5 py-4 text-sm text-ink">{new Date(`${item.date.slice(0, 10)}T00:00:00`).toLocaleDateString()}</td><td className="px-5 py-4 text-sm font-bold text-ink">{item.dog_name}</td><td className="px-5 py-4 text-sm text-ink">{item.nickname || "—"}</td><td className="whitespace-nowrap px-5 py-4 text-sm font-bold tabular-nums text-ink">{item.weight} kg</td><td className={`whitespace-nowrap px-5 py-4 text-sm font-bold tabular-nums ${item.difference == null ? "text-muted" : item.difference > 0 ? "text-green-600" : item.difference < 0 ? "text-red-600" : "text-muted"}`}>{item.difference == null ? "—" : `${item.difference > 0 ? "+" : ""}${item.difference} kg`}</td><td className="whitespace-nowrap px-5 py-4"><div className="flex gap-2"><Link className="rounded px-2 py-1 text-xs font-bold text-positive hover:bg-positive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-positive" to={`/weights/${encodeURIComponent(item.id)}/edit`}>Edit</Link><button type="button" className="rounded px-2 py-1 text-xs font-bold text-danger hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger" onClick={() => navigate("/subscribe", { replace: true })}>Delete</button></div></td></tr>)}</tbody></table></div>}
      {total > 0 && <Pagination page={page} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} label="records" />}
    </Panel>
  </div></AppShell>
}