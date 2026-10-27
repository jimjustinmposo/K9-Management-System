import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AppShell, Panel, PanelHeader } from "../components/AppShell"
import Pagination from "../components/Pagination"
import { useAuth } from "../lib/auth"
import { shoppingApi } from "../lib/shoppingApi"
import { useLatestLoad } from "../lib/useLatestLoad"
import type { ShoppingRecord } from "../types/shopping"

const PAGE_SIZE = 10
export default function ShoppingPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<ShoppingRecord[]>([]), [total, setTotal] = useState(0)
  const [search, setSearch] = useState(""), [type, setType] = useState("all"), [page, setPage] = useState(1), [loading, setLoading] = useState(true), [error, setError] = useState("")
  const read = useCallback(() => shoppingApi.page(search, type, PAGE_SIZE, (page - 1) * PAGE_SIZE), [search, type, page])
  const accept = useCallback((result: { data: ShoppingRecord[]; total: number }) => { setItems(result.data); setTotal(result.total) }, [])
  const load = useLatestLoad(read, accept, setLoading, setError, "Could not load shopping records.", `${search}:${type}`)
  useEffect(() => { setPage(1) }, [search, type])
  async function remove(item: ShoppingRecord) {
    if (!window.confirm(`Delete the shopping record for ${item.item}?`)) return
    try { await shoppingApi.remove(item.id); await load() } catch (err) { setError(err instanceof Error ? err.message : "Could not delete shopping record.") }
  }
  return <AppShell title="Shopping"><div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-positive">Purchases · register</p><h2 className="mt-1 text-xl font-semibold text-ink">Shopping</h2><p className="mt-1 text-sm text-muted">Track food and other purchases. Food purchases add their quantity to linked inventory stock.</p></div><Link to="/shopping/new" className="button-primary">+ Add purchase</Link></div>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter shopping records">{[{ id: "all", label: "All" }, { id: "food", label: "Food" }, { id: "others", label: "Others" }].map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={type === tab.id} onClick={() => setType(tab.id)} className={`rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-positive ${type === tab.id ? "border-positive bg-positive text-white shadow-sm" : "border-line bg-surface text-muted hover:border-positive hover:text-positive"}`}>{tab.label}</button>)}</div>
    <input aria-label="Search shopping records" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item or description…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-positive focus-visible:ring-2 focus-visible:ring-positive/30 md:max-w-sm" />
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
    <Panel><PanelHeader eyebrow="Purchase history" title={`${total} record${total === 1 ? "" : "s"}`} />
      {loading ? <p className="p-8 text-center text-sm text-muted">Loading shopping…</p> : total === 0 ? <div className="p-10 text-center"><p className="text-sm font-bold text-ink">No shopping records</p><p className="mt-1 text-xs text-muted">Add a food or other purchase to get started.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-canvas text-[10px] uppercase tracking-wider text-muted"><tr>{["Date", "Type", "Item", "Description", "Quantity", "Price", "Total", "Actions"].map((label) => <th key={label} className="px-4 py-3">{label === "Actions" ? <span className="sr-only">Actions</span> : label}</th>)}</tr></thead><tbody className="divide-y divide-line">{items.map((item) => <tr key={item.id} className="align-top transition-colors hover:bg-positive/5"><td className="whitespace-nowrap px-4 py-4 text-sm text-ink">{new Date(`${item.date.slice(0, 10)}T00:00:00`).toLocaleDateString()}</td><td className="px-4 py-4"><span className="rounded-full border border-positive/25 bg-positive-soft px-2.5 py-1 text-xs font-bold capitalize text-positive">{item.type}</span></td><td className="px-4 py-4 text-sm font-bold text-ink">{item.item}</td><td className="max-w-56 px-4 py-4 text-sm text-muted">{item.description || "—"}</td><td className="whitespace-nowrap px-4 py-4 text-sm tabular-nums text-ink">{item.quantity}{item.type === "food" ? " kg" : ""}</td><td className="whitespace-nowrap px-4 py-4 text-sm tabular-nums text-ink">{Number(item.price).toFixed(2)}</td><td className="whitespace-nowrap px-4 py-4 text-sm font-bold tabular-nums text-ink">{(Number(item.price) * Number(item.quantity)).toFixed(2)}</td><td className="whitespace-nowrap px-4 py-4"><div className="flex gap-2"><Link className="button-edit" to={`/shopping/${encodeURIComponent(item.id)}/edit`}>Edit</Link><button type="button" className="button-delete" onClick={() => navigate("/subscribe", { replace: true })}>Delete</button></div></td></tr>)}</tbody></table></div>}
      {total > 0 && <Pagination page={page} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} label="records" />}
    </Panel>
  </div></AppShell>
}