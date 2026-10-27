import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import Pagination from "../components/Pagination"
import { AppShell, Panel } from "../components/AppShell"
import { useAuth } from "../lib/auth"
import { inSeasonApi } from "../lib/inSeasonApi"
import { getSeasonDay, getSeasonReminders, type SeasonRecord } from "../types/inSeason"

type Filter = "All" | "Active" | "Ended"
const PAGE_SIZE = 10
const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
const formatDate = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"

export default function InSeasonPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [records, setRecords] = useState<SeasonRecord[]>([])
  const [filter, setFilter] = useState<Filter>(() => searchParams.get("status") === "Ended" ? "Ended" : searchParams.get("status") === "All" ? "All" : "Active")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState("")

  useEffect(() => {
    let active = true
    setLoading(true)
    inSeasonApi.list({ limit: 200 }).then((result) => { if (active) { setRecords(result.data); setError("") } })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load season records.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const visible = useMemo(() => records.filter((record) => {
    const matchesStatus = filter === "All" || record.status === filter
    const term = search.trim().toLowerCase()
    return matchesStatus && (!term || `${record.dogName} ${record.nickName} ${record.breed}`.toLowerCase().includes(term))
  }), [records, filter, search])
  const reminders = useMemo(() => records.filter((record) => record.status === "Active").flatMap((record) =>
    getSeasonReminders(record.startDate).map((item) => ({ ...item, record, currentSeasonDay: getSeasonDay(record.startDate) }))
  ).filter((item) => item.date >= today() || (item.date < today() && item.currentSeasonDay <= item.day + 7))
    .sort((a, b) => a.date.localeCompare(b.date)), [records])
  const shown = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => { setPage(1) }, [filter, search])

  async function remove(record: SeasonRecord) {
    if (!window.confirm(`Delete the season record for ${record.dogName}?`)) return
    setDeletingId(record.id)
    try { await inSeasonApi.remove(record.id); setRecords((rows) => rows.filter((row) => row.id !== record.id)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete season record.") }
    finally { setDeletingId("") }
  }

  return <AppShell title="In Season">
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-muted">Track heat cycles and key monitoring dates.</p></div><Link to="/in-season/new" className="button-primary">Start a season</Link></div>

      <Panel>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Upcoming dates</p><h2 className="text-base font-semibold text-ink">Season reminders</h2></div><span className="rounded-full border border-positive/30 bg-positive-soft px-3 py-1 text-xs font-bold text-positive" aria-label={`${reminders.length} upcoming reminders`}>{reminders.length}</span></div>
        {reminders.length ? <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{reminders.map((item) => {
          const state = item.date < today() ? "Overdue" : item.date === today() ? "Due today" : "Upcoming"
          const colors = state === "Overdue" ? "border-danger/40 bg-danger/10 text-danger" : state === "Due today" ? "border-gold/50 bg-gold/10 text-ink" : "border-line bg-canvas text-muted"
          return <article key={`${item.record.id}-${item.day}`} className={`rounded-xl border p-4 ${colors}`}><div className="flex items-start justify-between gap-2"><p className="font-semibold">{item.title}</p><span className="shrink-0 rounded-full border border-current/25 px-2 py-0.5 text-[10px] font-bold">{state}</span></div><p className="mt-2 text-xs font-medium">{item.record.dogName} · {formatDate(item.date)}</p><p className="mt-1 text-[11px]">Day {item.day}</p></article>
        })}</div> : <p className="px-5 py-8 text-center text-sm text-muted">No upcoming reminders. Start tracking an active season to see its schedule.</p>}
      </Panel>

      <Panel>
        <div className="flex flex-col gap-4 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex flex-wrap gap-2" role="group" aria-label="Filter seasons">{(["Active", "Ended", "All"] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-full border px-4 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${filter === value ? "border-gold bg-gold/20 text-ink ring-1 ring-gold" : "border-line bg-surface text-muted hover:border-positive hover:text-positive"}`}>{value}</button>)}</div><label className="sr-only" htmlFor="season-search">Search seasons</label><input id="season-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search K9s…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink sm:max-w-xs" /></div>
        {error && <p role="alert" className="m-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        {loading ? <p className="p-10 text-center text-sm text-muted">Loading seasons…</p> : shown.length === 0 ? <div className="p-10 text-center"><p className="font-semibold text-ink">No season records found</p><p className="mt-1 text-sm text-muted">Start tracking a heat cycle to see its dates and reminders here.</p></div> : <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{shown.map((record) => <article key={record.id} className="app-panel rounded-xl border border-line bg-surface p-4 shadow-filter"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-ink">{record.dogName}{record.nickName ? <span className="ml-1 text-muted">({record.nickName})</span> : null}</h3><p className="mt-1 text-xs text-muted">{record.breed || "K9"}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${record.status === "Active" ? "border-positive/30 bg-positive-soft text-positive" : "border-line bg-canvas text-muted"}`}>{record.status}</span></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-line bg-canvas p-3"><div><p className="text-[10px] font-bold uppercase text-muted">Started</p><p className="mt-1 text-sm font-semibold text-ink">{formatDate(record.startDate)}</p></div><div><p className="text-[10px] font-bold uppercase text-muted">{record.endDate ? "Ended" : "Current day"}</p><p className="mt-1 text-sm font-semibold text-ink">{record.endDate ? formatDate(record.endDate) : `Day ${getSeasonDay(record.startDate)}`}</p></div></div>{record.notes && <p className="mt-3 line-clamp-2 text-sm text-muted">{record.notes}</p>}<div className="mt-4 flex flex-wrap gap-2"><Link to={`/in-season/${record.id}/edit`} className="button-secondary min-h-9 px-3 py-1.5 text-xs">Edit</Link><button type="button" disabled={deletingId === record.id} onClick={() => navigate("/subscribe", { replace: true })} className="min-h-9 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:opacity-50">{deletingId === record.id ? "Deleting…" : "Delete"}</button></div></article>)}</div>}
        {!loading && <Pagination page={page} totalItems={visible.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="seasons" />}
      </Panel>
    </div>
  </AppShell>
}