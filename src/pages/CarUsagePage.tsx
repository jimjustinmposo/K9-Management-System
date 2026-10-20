import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AppShell, Panel, PanelHeader } from "../components/AppShell"
import Pagination from "../components/Pagination"
import { useAuth } from "../lib/auth"
import { carUsageApi } from "../lib/carUsageApi"
import type { CarUsageRecord } from "../types/carUsage"

const PAGE_SIZE = 10
const formatDate = (value: string) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString() : "—"

export default function CarUsagePage() {
  const { session } = useAuth()
  const [records, setRecords] = useState<CarUsageRecord[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState("")
  const load = useCallback(async () => {
    setLoading(true)
    try { const result = await carUsageApi.list({ search, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }); setRecords(result.data); setTotal(result.total); setError("") }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load car usage records.") }
    finally { setLoading(false) }
  }, [page, search])
  useEffect(() => { void load() }, [load])
  useEffect(() => { setPage(1) }, [search])

  async function remove(record: CarUsageRecord) {
    if (!window.confirm(`Delete the car usage record for ${record.driver}?`)) return
    setDeletingId(record.id)
    try { await carUsageApi.remove(record.id); await load() }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete car usage record.") }
    finally { setDeletingId("") }
  }

  return <AppShell title="Car Usage"><div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-positive">Fleet · usage log</p><h2 className="mt-1 text-xl font-semibold text-ink">Car Usage</h2><p className="mt-1 text-sm text-muted">Track vehicle trips, drivers, and odometer readings.</p></div>{session?.permissions.create && <Link to="/car-usage/new" className="button-primary">+ Add car usage</Link>}</div>
    <label className="sr-only" htmlFor="car-usage-search">Search car usage records</label><input id="car-usage-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by driver or K9…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-positive md:max-w-sm" />
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    <Panel><PanelHeader eyebrow="Vehicle log" title={`${total} record${total === 1 ? "" : "s"}`} />
      {loading ? <p className="p-8 text-center text-sm text-muted">Loading car usage…</p> : records.length === 0 ? <div className="p-10 text-center"><p className="font-semibold text-ink">{search ? "No matching records" : "No car usage records yet"}</p><p className="mt-1 text-sm text-muted">{search ? "Try another driver or K9 name." : "Add the first trip to get started."}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-canvas text-[10px] uppercase tracking-wider text-muted"><tr>{["Date", "Driver", "K9", "Time in", "KM start", "Time out", "KM end", "KM used", "Actions"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-line">{records.map((record) => <tr key={record.id}><td className="whitespace-nowrap px-4 py-4 text-sm text-ink">{formatDate(record.date)}</td><td className="px-4 py-4 text-sm font-bold text-ink">{record.driver}</td><td className="px-4 py-4 text-sm text-ink">{record.dogName}{record.nickName && <span className="ml-1 text-muted">({record.nickName})</span>}</td><td className="px-4 py-4 text-sm text-ink">{record.timeIn}</td><td className="px-4 py-4 text-sm text-ink">{record.kmStart.toLocaleString()}</td><td className="px-4 py-4 text-sm text-ink">{record.timeOut}</td><td className="px-4 py-4 text-sm text-ink">{record.kmEnd.toLocaleString()}</td><td className="px-4 py-4 text-sm font-semibold text-ink">{record.kmUsed.toLocaleString()}</td><td className="whitespace-nowrap px-4 py-4"><div className="flex gap-2">{session?.permissions.edit && <Link className="button-edit" to={`/car-usage/${encodeURIComponent(record.id)}/edit`}>Edit</Link>}{session?.permissions.delete && <button type="button" disabled={deletingId === record.id} className="button-delete disabled:opacity-50" onClick={() => void remove(record)}>{deletingId === record.id ? "Deleting…" : "Delete"}</button>}</div></td></tr>)}</tbody></table></div>}
      {total > 0 && <Pagination page={page} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} label="car usage records" />}
    </Panel>
  </div></AppShell>
}