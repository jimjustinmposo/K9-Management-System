import { useEffect, useState } from "react"
import { k9Api } from "../lib/k9Api"
import type { K9Record } from "../types/k9"

export default function ReportDogSelector({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const [dogs, setDogs] = useState<K9Record[]>([])
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError("")
    k9Api.list().then(rows => { if (active) setDogs(rows) }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Could not load dogs.") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [retry])
  const visible = dogs.filter(dog => `${dog.dogName} ${dog.nickName} ${dog.microchipNumber}`.toLowerCase().includes(search.trim().toLowerCase()))
  return <fieldset className="space-y-3 border-t border-line pt-4">
    <legend className="px-1 text-sm font-semibold text-ink">Dogs to include</legend>
    <div className="flex flex-wrap items-center gap-3"><input type="search" aria-label="Search dogs for report" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, nickname or microchip…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink md:max-w-sm" /><button type="button" className="button-secondary" onClick={() => onChange([])}>All dogs</button><span className="text-xs text-muted">{selected.length ? `${selected.length} selected` : "All workspace dogs"}</span></div>
    <p className="text-xs text-muted">Select one or multiple dogs. No selection includes all dogs (up to 90). Profiles are current; activity is filtered by the selected period.</p>
    {loading ? <p role="status" className="text-sm text-muted">Loading dogs…</p> : error ? <div role="alert" className="text-sm text-danger">{error} <button type="button" className="button-secondary" onClick={() => setRetry(value => value + 1)}>Retry</button></div> : <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{visible.map(dog => <label key={dog.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm text-ink"><input type="checkbox" checked={selected.includes(dog.id)} disabled={!selected.includes(dog.id) && selected.length >= 90} onChange={() => onChange(selected.includes(dog.id) ? selected.filter(id => id !== dog.id) : [...selected, dog.id])} /><span>{dog.dogName}<span className="block text-xs text-muted">{dog.nickName || dog.breed} · {dog.microchipNumber || dog.id}</span></span></label>)}{!visible.length && <p className="text-sm text-muted">No dogs found.</p>}</div>}
  </fieldset>
}