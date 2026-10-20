import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AppShell, Panel, PanelHeader } from "../components/AppShell"
import Pagination from "../components/Pagination"
import { useAuth } from "../lib/auth"
import { groomingApi } from "../lib/groomingApi"
import type { GroomingRecord } from "../types/grooming"

const PAGE_SIZE = 10
const formatDate = (value: string) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString() : "—"
const mark = (value: boolean) => <span className={`inline-grid size-5 place-items-center rounded border text-xs font-bold ${value ? "border-positive bg-positive-soft text-positive" : "border-line text-muted"}`} aria-label={value ? "Done" : "Not done"}>{value ? "✓" : "—"}</span>

export default function GroomingPage() {
  const { session } = useAuth()
  const [records, setRecords] = useState<GroomingRecord[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState("")
  const load = useCallback(async () => {
    setLoading(true)
    try { const result = await groomingApi.list({ search, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }); setRecords(result.data); setTotal(result.total); setError("") }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load grooming records.") }
    finally { setLoading(false) }
  }, [page, search])
  useEffect(() => { void load() }, [load])
  useEffect(() => { setPage(1) }, [search])

  async function remove(record: GroomingRecord) {
    if (!window.confirm(`Delete the grooming record for ${record.dogName}?`)) return
    setDeletingId(record.id)
    try { await groomingApi.remove(record.id); await load() }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete grooming record.") }
    finally { setDeletingId("") }
  }

  return <AppShell title="Grooming"><div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><Link to="/training" className="text-xs font-bold text-positive">← Training registers</Link><p className="mt-4 text-[10px] font-semibold uppercase tracking-[.12em] text-positive">K9 care · grooming log</p><h2 className="mt-1 text-xl font-semibold text-ink">Grooming register</h2><p className="mt-1 text-sm text-muted">Track care completed for each registered K9.</p></div>{session?.permissions.create && <Link to="/grooming/new" className="button-primary">+ Add grooming</Link>}</div>
    <label className="sr-only" htmlFor="grooming-search">Search grooming records</label><input id="grooming-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by K9…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-positive md:max-w-sm" />
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    <Panel><PanelHeader eyebrow="Grooming register" title={`${total} record${total === 1 ? "" : "s"}`} />
      {loading ? <p className="p-8 text-center text-sm text-muted">Loading grooming records…</p> : records.length === 0 ? <div className="p-10 text-center"><p className="font-semibold text-ink">{search ? "No matching records" : "No grooming records yet"}</p><p className="mt-1 text-sm text-muted">{search ? "Try another K9 name." : "Add the first grooming entry to get started."}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-canvas text-[10px] uppercase tracking-wider text-muted"><tr>{["Date", "K9", "Bathing", "Nails", "Ears", "Brushing", "Price (AED)", "Actions"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-line">{records.map((record) => <tr key={record.id} className="align-middle"><td className="whitespace-nowrap px-4 py-4 text-sm text-ink">{formatDate(record.date)}</td><td className="px-4 py-4 text-sm font-bold text-ink">{record.dogName}{record.nickName && <span className="ml-1 font-normal text-muted">({record.nickName})</span>}</td><td className="px-4 py-4">{mark(record.bathing)}</td><td className="px-4 py-4">{mark(record.nails)}</td><td className="max-w-40 whitespace-pre-wrap px-4 py-4 text-sm text-muted">{record.ears || "—"}</td><td className="px-4 py-4">{mark(record.brushing)}</td><td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-ink">AED {record.price.toFixed(2)}</td><td className="whitespace-nowrap px-4 py-4"><div className="flex gap-2">{session?.permissions.edit && <Link className="button-edit" to={`/grooming/${encodeURIComponent(record.id)}/edit`}>Edit</Link>}{session?.permissions.delete && <button type="button" disabled={deletingId === record.id} className="button-delete disabled:opacity-50" onClick={() => void remove(record)}>{deletingId === record.id ? "Deleting…" : "Delete"}</button>}</div></td></tr>)}</tbody></table></div>}
      {total > 0 && <Pagination page={page} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} label="grooming records" />}
    </Panel>
  </div></AppShell>
}