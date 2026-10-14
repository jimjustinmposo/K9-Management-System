import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AppShell, Panel } from "../components/AppShell"
import { foodInventoryApi } from "../lib/foodInventoryApi"
import { EMPTY_FOOD_INVENTORY_FORM, type FoodInventoryFormValues } from "../types/foodInventory"

const inputClass = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-positive focus-visible:ring-2 focus-visible:ring-positive/30"
const labelClass = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate"

export default function FoodInventoryFormPage() {
  const { id } = useParams<{ id: string }>(), navigate = useNavigate()
  const [form, setForm] = useState<FoodInventoryFormValues>(EMPTY_FOOD_INVENTORY_FORM)
  const [loading, setLoading] = useState(Boolean(id)), [saving, setSaving] = useState(false), [error, setError] = useState("")
  useEffect(() => {
    if (!id) return
    let active = true
    void foodInventoryApi.get(id).then((record) => {
      if (active) setForm({ date: record.date.slice(0, 10), item: record.item, brand: record.brand, amount: String(record.amount) })
    }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not load inventory record.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  function set<K extends keyof FoodInventoryFormValues>(key: K, value: FoodInventoryFormValues[K]) { setForm((current) => ({ ...current, [key]: value })) }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("")
    try { if (id) await foodInventoryApi.update(id, form); else await foodInventoryApi.create(form); navigate("/food-inventory", { replace: true }) }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save inventory record.") }
    finally { setSaving(false) }
  }
  return <AppShell title={id ? "Edit Food Stock" : "Add Food Stock"}><form onSubmit={(event) => void submit(event)} className="mx-auto max-w-3xl space-y-5">
    <div><Link to="/food-inventory" className="rounded px-1 py-1 text-xs font-bold text-positive transition hover:bg-positive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-positive">← Food Inventory</Link><p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.16em] text-positive">K9 care · stock entry</p><h2 className="mt-1 text-2xl font-bold text-ink">{id ? "Update food stock" : "Record incoming food stock"}</h2><p className="mt-1 text-sm text-muted">Enter stock in kg. Feeding usage matches the food item name and converts feeding grams to kg.</p></div>
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
    {loading ? <Panel className="p-8 text-center text-sm text-muted">Loading inventory record…</Panel> : <>
      <Panel className="grid gap-4 p-5 md:grid-cols-2">
        <div><label htmlFor="inventory-date" className={labelClass}>Date <span className="text-danger">*</span></label><input id="inventory-date" type="date" required className={inputClass} value={form.date} onChange={(event) => set("date", event.target.value)} /></div>
        <div><label htmlFor="inventory-item" className={labelClass}>Food item <span className="text-danger">*</span></label><input id="inventory-item" required maxLength={200} className={inputClass} value={form.item} onChange={(event) => set("item", event.target.value)} placeholder="Must match the Food name used in feeding" /></div>
        <div><label htmlFor="inventory-brand" className={labelClass}>Food / brand</label><input id="inventory-brand" maxLength={200} className={inputClass} value={form.brand} onChange={(event) => set("brand", event.target.value)} placeholder="Optional brand name" /></div>
        <div><label htmlFor="inventory-amount" className={labelClass}>Amount stocked <span className="text-danger">*</span></label><div className="flex items-center gap-2"><input id="inventory-amount" required type="number" min="0" max="1000000" step="any" className={inputClass} value={form.amount} onChange={(event) => set("amount", event.target.value)} placeholder="0" /><span className="text-sm font-bold text-muted">kg</span></div></div>
      </Panel>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Link to="/food-inventory" className="button-secondary">Cancel</Link><button type="submit" disabled={saving} className="button-primary transition active:scale-[.98]">{saving ? "Saving…" : id ? "Save changes" : "Add stock"}</button></div>
    </>}
  </form></AppShell>
}