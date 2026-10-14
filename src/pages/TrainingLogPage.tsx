import { useCallback, useEffect, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { AppShell, Panel, PanelHeader } from "../components/AppShell"
import { useAuth } from "../lib/auth"
import { trainingApi } from "../lib/trainingApi"
import { isTrainingDiscipline, TRAINING_DISCIPLINES, type TrainingSession } from "../types/training"
import Pagination from "../components/Pagination"

const PAGE_SIZE = 10

function formatDate(value: string) { return value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString() : "—" }

export default function TrainingLogPage() {
  const { discipline: raw } = useParams<{ discipline: string }>()
  const { session } = useAuth()
  const [items, setItems] = useState<TrainingSession[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const valid = isTrainingDiscipline(raw)
  const definition = TRAINING_DISCIPLINES.find((item) => item.id === raw)
  const load = useCallback(async () => {
    if (!valid || !raw) return
    setLoading(true); setError("")
    try { const result = await trainingApi.page(raw, search, PAGE_SIZE, (page - 1) * PAGE_SIZE); setItems(result.data); setTotal(result.total) }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load training records.") }
    finally { setLoading(false) }
  }, [raw, search, valid, page])
  useEffect(() => { void load() }, [load])
  useEffect(() => { setPage(1) }, [search, raw])
  if (!valid || !definition) return <Navigate to="/training" replace />

  async function remove(item: TrainingSession) {
    if (!window.confirm(`Delete this ${definition!.name.toLowerCase()} record for ${item.dog_name}?`)) return
    try { await trainingApi.remove(raw as Parameters<typeof trainingApi.remove>[0], item.id); await load() }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete training record.") }
  }

  return <AppShell title={definition.name}><div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><Link to="/training" className="text-xs font-medium text-positive">← Training registers</Link><p className="mt-4 text-[10px] font-semibold uppercase tracking-[.12em] text-positive">K9 training · session log</p><h2 className="mt-1 text-xl font-semibold text-ink">{definition.name}</h2><p className="mt-1 text-sm text-muted">Training records linked to your K9 and handler rosters.</p></div>{session?.permissions.create && <Link to={`/training/${raw}/new`} className="button-primary">+ Add session</Link>}</div>
    <input aria-label="Search training records" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dog, handler or note…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-positive md:max-w-sm" />
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
<<<<<<< HEAD
    <Panel><PanelHeader eyebrow="Training register" title={`${total} session${total === 1 ? "" : "s"}`} />{loading ? <p className="p-8 text-center text-sm text-muted">Loading sessions…</p> : total === 0 ? <div className="p-10 text-center"><p className="text-sm font-bold text-ink">{search ? "No matching sessions" : "No training sessions yet"}</p><p className="mt-1 text-xs text-muted">{search ? "Try a different search." : "Add the first session to this register."}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-canvas text-[10px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Dog name</th><th className="px-5 py-3">Handler name</th><th className="px-5 py-3">NOTES</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-line">{items.map((item) => <tr key={item.id} className="align-top"><td className="whitespace-nowrap px-5 py-4 text-sm text-ink">{formatDate(item.session_date)}</td><td className="px-5 py-4 text-sm font-bold text-ink">{item.dog_name}</td><td className="px-5 py-4 text-sm text-ink">{item.handler_name}</td><td className="max-w-md whitespace-pre-wrap px-5 py-4 text-sm text-muted">{item.note || "—"}</td><td className="whitespace-nowrap px-5 py-4"><div className="flex gap-3">{session?.permissions.create && <Link className="text-xs font-bold text-positive" to={`/training/${raw}/${encodeURIComponent(item.id)}/edit`}>Edit</Link>}{session?.permissions.delete && <button type="button" className="text-xs font-bold text-danger" onClick={() => void remove(item)}>Delete</button>}</div></td></tr>)}</tbody></table></div>}{total > 0 && <Pagination page={page} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} label="sessions" />}</Panel>
=======
    <Panel><PanelHeader eyebrow="Training register" title={`${total} session${total === 1 ? "" : "s"}`} />{loading ? <p className="p-8 text-center text-sm text-muted">Loading sessions…</p> : total === 0 ? <div className="p-10 text-center"><p className="text-sm font-bold text-ink">{search ? "No matching sessions" : "No training sessions yet"}</p><p className="mt-1 text-xs text-muted">{search ? "Try a different search." : "Add the first session to this register."}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-canvas text-[10px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Dog name</th><th className="px-5 py-3">Handler name</th><th className="px-5 py-3">Note</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-line">{items.map((item) => <tr key={item.id} className="align-top"><td className="whitespace-nowrap px-5 py-4 text-sm text-ink">{formatDate(item.session_date)}</td><td className="px-5 py-4 text-sm font-bold text-ink">{item.dog_name}</td><td className="px-5 py-4 text-sm text-ink">{item.handler_name}</td><td className="max-w-md whitespace-pre-wrap px-5 py-4 text-sm text-muted">{item.note || "—"}</td><td className="whitespace-nowrap px-5 py-4"><div className="flex gap-2">{session?.permissions.create && <Link className="button-edit" to={`/training/${raw}/${encodeURIComponent(item.id)}/edit`}>Edit</Link>}{session?.permissions.delete && <button type="button" className="button-delete" onClick={() => void remove(item)}>Delete</button>}</div></td></tr>)}</tbody></table></div>}{total > 0 && <Pagination page={page} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} label="sessions" />}</Panel>
>>>>>>> weight
  </div></AppShell>
}