import { useCallback, useEffect, useState } from "react"
import { useLatestLoad } from "../lib/useLatestLoad"
import { Link, useNavigate } from "react-router-dom"
import { AppShell, Panel, PanelHeader } from "../components/AppShell"
import Pagination from "../components/Pagination"
import { useAuth } from "../lib/auth"
import { feedingApi } from "../lib/feedingApi"
import type { FeedingRecord } from "../types/feeding"

const PAGE_SIZE = 10
const dateLabel = (value: string) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString() : "—"

export default function FeedingPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<FeedingRecord[]>([]), [total, setTotal] = useState(0)
  const [search, setSearch] = useState(""), [page, setPage] = useState(1), [loading, setLoading] = useState(true), [error, setError] = useState("")
  const read = useCallback(() => feedingApi.page(search, PAGE_SIZE, (page - 1) * PAGE_SIZE), [search, page])
  const accept = useCallback((result: { data: FeedingRecord[]; total: number }) => { setItems(result.data); setTotal(result.total) }, [])
  const load = useLatestLoad(read, accept, setLoading, setError, "Could not load feeding records.", search)
  useEffect(() => { setPage(1) }, [search])

  async function remove(item: FeedingRecord) {
    if (!window.confirm(`Delete the feeding record for ${item.dog_name}?`)) return
    try { await feedingApi.remove(item.id); await load() }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete feeding record.") }
  }

  return <AppShell title="K9 Feeding"><div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-positive">K9 care · feeding register</p><h2 className="mt-1 text-xl font-semibold text-ink">K9 Feeding</h2><p className="mt-1 text-sm text-muted">Track each dog’s food, portion size, and handler.</p></div><Link to="/feeding/new" className="button-primary">+ Add feeding record</Link></div>
    <input aria-label="Search feeding records" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dog, handler, food or notes…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-positive md:max-w-sm" />
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
    <Panel><PanelHeader eyebrow="Feeding register" title={`${total} record${total === 1 ? "" : "s"}`} />
      {loading ? <p className="p-8 text-center text-sm text-muted">Loading feeding records…</p> : total === 0 ? <div className="p-10 text-center"><p className="text-sm font-bold text-ink">{search ? "No matching records" : "No feeding records yet"}</p><p className="mt-1 text-xs text-muted">{search ? "Try a different search." : "Add the first record to this register."}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-canvas text-[10px] uppercase tracking-wider text-muted"><tr>{["Date", "Dog", "Handler", "Food", "Grams", "Notes", "Actions"].map((label) => <th key={label} className="px-5 py-3">{label === "Actions" ? <span className="sr-only">Actions</span> : label}</th>)}</tr></thead><tbody className="divide-y divide-line">{items.map((item) => <tr key={item.id} className="align-top"><td className="whitespace-nowrap px-5 py-4 text-sm text-ink">{dateLabel(item.date)}</td><td className="px-5 py-4 text-sm font-bold text-ink">{item.dog_name}</td><td className="px-5 py-4 text-sm text-ink">{item.handler_name}</td><td className="px-5 py-4 text-sm text-ink">{item.food}</td><td className="whitespace-nowrap px-5 py-4 text-sm tabular-nums text-ink">{item.grams} g</td><td className="max-w-xs whitespace-pre-wrap px-5 py-4 text-sm text-muted">{item.noted || "—"}</td><td className="whitespace-nowrap px-5 py-4"><div className="flex gap-2"><Link className="button-edit" to={`/feeding/${encodeURIComponent(item.id)}/edit`}>Edit</Link><button type="button" className="button-delete" onClick={() => navigate("/subscribe", { replace: true })}>Delete</button></div></td></tr>)}</tbody></table></div>}
      {total > 0 && <Pagination page={page} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} label="records" />}
    </Panel>
  </div></AppShell>
}