import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AppShell, Panel, PanelHeader } from "../components/AppShell"
import Pagination from "../components/Pagination"
import { useAuth } from "../lib/auth"
import { foodInventoryApi } from "../lib/foodInventoryApi"
import { useLatestLoad } from "../lib/useLatestLoad"
import type { FoodInventoryRecord } from "../types/foodInventory"

const PAGE_SIZE = 10
const dateLabel = (value: string) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString() : "—"
const kg = (value: number) => `${Number(value.toFixed(3))} kg`

export default function FoodInventoryPage() {
  const { session } = useAuth()
  const [items, setItems] = useState<FoodInventoryRecord[]>([]), [total, setTotal] = useState(0)
  const [search, setSearch] = useState(""), [page, setPage] = useState(1), [loading, setLoading] = useState(true), [error, setError] = useState("")
  const [stockItem, setStockItem] = useState<FoodInventoryRecord | null>(null), [stockAmount, setStockAmount] = useState(""), [stockUnit, setStockUnit] = useState<"g" | "kg">("kg"), [stockSaving, setStockSaving] = useState(false)
  const read = useCallback(() => foodInventoryApi.page(search, PAGE_SIZE, (page - 1) * PAGE_SIZE), [search, page])
  const accept = useCallback((result: { data: FoodInventoryRecord[]; total: number }) => { setItems(result.data); setTotal(result.total) }, [])
  const load = useLatestLoad(read, accept, setLoading, setError, "Could not load food inventory.", search)
  useEffect(() => { setPage(1) }, [search])
  async function remove(item: FoodInventoryRecord) {
    if (!window.confirm(`Delete the ${item.item} inventory entry?`)) return
    try { await foodInventoryApi.remove(item.id); await load() }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete inventory entry.") }
  }
  async function addStock(event: React.FormEvent) {
    event.preventDefault()
    if (!stockItem) return
    setStockSaving(true); setError("")
    try { await foodInventoryApi.addStock(stockItem.id, Number(stockAmount) * (stockUnit === "g" ? 0.001 : 1)); setStockItem(null); setStockAmount(""); await load() }
    catch (err) { setError(err instanceof Error ? err.message : "Could not add stock.") }
    finally { setStockSaving(false) }
  }
  return <AppShell title="Food Inventory"><div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-positive">K9 care · stock register</p><h2 className="mt-1 text-xl font-semibold text-ink">Food Inventory</h2><p className="mt-1 text-sm text-muted">Track stock in kilograms. Usage is calculated from matching K9 Feeding records (grams converted to kg).</p></div>{session?.permissions.create && <Link to="/food-inventory/new" className="button-primary">+ New food</Link>}</div>
    <input aria-label="Search food inventory" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search food or brand…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-positive focus-visible:ring-2 focus-visible:ring-positive/30 md:max-w-sm" />
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
    <Panel><PanelHeader eyebrow="Stock and consumption" title={`${total} entr${total === 1 ? "y" : "ies"}`} />
      {loading ? <p className="p-8 text-center text-sm text-muted">Loading food inventory…</p> : total === 0 ? <div className="p-10 text-center"><p className="text-sm font-bold text-ink">{search ? "No matching stock" : "No food stock recorded"}</p><p className="mt-1 text-xs text-muted">{search ? "Try a different search." : "Add stock to see feeding usage and remaining quantity."}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-canvas text-[10px] uppercase tracking-wider text-muted"><tr>{["Date", "Food item", "Brand", "Stocked", "Used", "Remaining", "Actions"].map((label) => <th key={label} className="px-5 py-3">{label === "Actions" ? <span className="sr-only">Actions</span> : label}</th>)}</tr></thead><tbody className="divide-y divide-line">{items.map((item) => <tr key={item.id} className="align-top transition-colors hover:bg-positive/5"><td className="whitespace-nowrap px-5 py-4 text-sm text-ink">{dateLabel(item.date)}</td><td className="px-5 py-4 text-sm font-bold text-ink">{item.item}</td><td className="px-5 py-4 text-sm text-ink">{item.brand || "—"}</td><td className="whitespace-nowrap px-5 py-4 text-sm tabular-nums text-ink">{kg(item.amount)}</td><td className="whitespace-nowrap px-5 py-4 text-sm tabular-nums text-muted">{kg(item.used)}</td><td className={`whitespace-nowrap px-5 py-4 text-sm font-bold tabular-nums ${item.remaining < 0 ? "text-danger" : "text-positive"}`}>{kg(item.remaining)}</td><td className="whitespace-nowrap px-5 py-4"><div className="flex gap-2">{session?.permissions.create && <><Link className="button-edit" to={`/food-inventory/${encodeURIComponent(item.id)}/edit`}>Edit</Link><button type="button" className="button-secondary" onClick={() => { setStockItem(item); setStockAmount(""); setStockUnit("kg") }}>Add stock</button></>}{session?.permissions.delete && <button type="button" className="button-delete" onClick={() => void remove(item)}>Delete</button>}</div></td></tr>)}</tbody></table></div>}
      {total > 0 && <Pagination page={page} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} label="entries" />}
    </Panel>
    {stockItem && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !stockSaving) setStockItem(null) }}><form role="dialog" aria-modal="true" aria-labelledby="add-stock-title" onSubmit={(event) => void addStock(event)} className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-xl"><div><h3 id="add-stock-title" className="text-lg font-bold text-ink">Add stock</h3><p className="mt-1 text-sm text-muted">Add to existing stock for {stockItem.item}. Current stocked amount: {kg(stockItem.amount)}.</p></div><label className="block text-sm font-semibold text-ink" htmlFor="restock-amount">Amount to add</label><div className="flex gap-2"><input id="restock-amount" required autoFocus type="number" min="0.001" step="any" value={stockAmount} onChange={(event) => setStockAmount(event.target.value)} className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-positive focus-visible:ring-2 focus-visible:ring-positive/30" placeholder="Enter quantity"/><select aria-label="Stock unit" value={stockUnit} onChange={(event) => setStockUnit(event.target.value as "g" | "kg")} className="rounded-xl border border-line bg-surface px-3 text-sm text-ink"><option value="g">g</option><option value="kg">kg</option></select></div><p className="text-xs text-muted">New total: {kg(stockItem.amount + (Number(stockAmount || 0) * (stockUnit === "g" ? 0.001 : 1)))}</p><div className="flex justify-end gap-2"><button type="button" className="button-secondary" disabled={stockSaving} onClick={() => setStockItem(null)}>Cancel</button><button type="submit" className="button-primary" disabled={stockSaving}>{stockSaving ? "Adding…" : "Add stock"}</button></div></form></div>}
  </div></AppShell>
}