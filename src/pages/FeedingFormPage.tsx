import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AppShell, Panel } from "../components/AppShell"
import SearchableSelect from "../components/SearchableSelect"
import { handlersApi } from "../lib/handlersApi"
import { k9Api } from "../lib/k9Api"
import { feedingApi } from "../lib/feedingApi"
import { foodInventoryApi } from "../lib/foodInventoryApi"
import type { Handler } from "../types/handlers"
import type { K9Record } from "../types/k9"
import type { FoodInventoryRecord } from "../types/foodInventory"
import { EMPTY_FEEDING_FORM, type FeedingFormValues } from "../types/feeding"

const inputClass = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-positive focus-visible:ring-2 focus-visible:ring-positive/30"
const labelClass = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate"

export default function FeedingFormPage() {
  const { id } = useParams<{ id: string }>(), navigate = useNavigate()
  const [form, setForm] = useState<FeedingFormValues>(EMPTY_FEEDING_FORM), [dogs, setDogs] = useState<K9Record[]>([]), [handlers, setHandlers] = useState<Handler[]>([]), [inventory, setInventory] = useState<FoodInventoryRecord[]>([])
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState("")
  useEffect(() => {
    let active = true
    void Promise.all([k9Api.list(), handlersApi.list(), foodInventoryApi.list(), id ? feedingApi.get(id) : Promise.resolve(null)])
      .then(([roster, team, stocks, record]) => {
        if (!active) return
        setDogs(roster); setHandlers(team); setInventory(stocks)
        if (record) setForm({ date: record.date.slice(0, 10), dog: record.dog, handler: record.handler, food: record.food, grams: String(record.grams), unit: "g", noted: record.noted })
      }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not load feeding form.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  function set<K extends keyof FeedingFormValues>(key: K, value: FeedingFormValues[K]) { setForm((current) => ({ ...current, [key]: value })) }
  const foodOptions = [...new Map(inventory.map((item) => [item.item.trim().toLocaleLowerCase(), { value: item.item, label: item.brand ? `${item.item} (${item.brand})` : item.item }])).values()]
  const selectedStock = inventory.filter((item) => item.item.trim().toLocaleLowerCase() === form.food.trim().toLocaleLowerCase())
  const selectedAvailableKg = selectedStock.length ? Math.max(0, selectedStock.reduce((sum, item) => sum + item.amount, 0) - selectedStock[0].used) : 0
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("")
    try {
      if (!selectedStock.length) throw new Error(`Food “${form.food}” is not in the food inventory. Add it to Food Inventory before recording a feeding.`)
      if (id) await feedingApi.update(id, form); else await feedingApi.create(form)
      navigate("/feeding", { replace: true })
    }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save feeding record.") }
    finally { setSaving(false) }
  }

  return <AppShell title={id ? "Edit Feeding Record" : "Add Feeding Record"}><form onSubmit={(event) => void submit(event)} className="mx-auto max-w-3xl space-y-5">
    <div><Link to="/feeding" className="rounded px-1 py-1 text-xs font-bold text-positive hover:bg-positive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-positive">← K9 Feeding</Link><p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.16em] text-positive">K9 care · feeding record</p><h2 className="mt-1 font-rajdhani text-3xl font-bold text-ink">{id ? "Update feeding details" : "Record a feeding"}</h2><p className="mt-1 text-sm text-muted">Link this feeding to a registered K9 and handler.</p></div>
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
    {loading ? <Panel className="p-8 text-center text-sm text-muted">Loading feeding form…</Panel> : <>
      <Panel className="grid gap-4 p-5 md:grid-cols-2">
        <div><label htmlFor="feeding-date" className={labelClass}>Date <span className="text-danger">*</span></label><input id="feeding-date" type="date" required className={inputClass} value={form.date} onChange={(event) => set("date", event.target.value)} /></div>
        <div><label htmlFor="feeding-dog" className={labelClass}>Dog <span className="text-danger">*</span></label><SearchableSelect id="feeding-dog" required className={inputClass} value={form.dog} onChange={(value) => set("dog", value)} placeholder="Select or search for a K9" options={dogs.map((dog) => ({ value: dog.id, label: `${dog.dogName}${dog.nickName ? ` “${dog.nickName}”` : ""}` }))} />{dogs.length === 0 && <Link to="/k9-roster/new" className="mt-1 inline-block rounded px-1 py-1 text-xs font-bold text-positive hover:bg-positive/10">Add a K9 to the roster</Link>}</div>
        <div><label htmlFor="feeding-handler" className={labelClass}>Handler <span className="text-danger">*</span></label><SearchableSelect id="feeding-handler" required className={inputClass} value={form.handler} onChange={(value) => set("handler", value)} placeholder="Select or search for a handler" options={handlers.map((handler) => ({ value: handler.id, label: handler.full_name }))} />{handlers.length === 0 && <p className="mt-1 text-xs text-muted">Add a handler to the directory before recording a feeding.</p>}</div>
        <div><label htmlFor="feeding-food" className={labelClass}>Food <span className="text-danger">*</span></label><SearchableSelect id="feeding-food" required className={inputClass} value={form.food} onChange={(value) => set("food", value)} placeholder="Select or search food inventory" options={foodOptions} />{!inventory.length && <p className="mt-1 text-xs text-danger">No food in inventory. <Link className="font-bold text-positive underline" to="/food-inventory/new">Add food stock</Link> before recording a feeding.</p>}{form.food && !selectedStock.length && <p role="alert" className="mt-1 text-xs text-danger">This food is not in the food inventory. Add it before saving.</p>}{selectedStock.length > 0 && <p className="mt-1 text-xs text-muted">Available: {Math.max(0, selectedAvailableKg).toFixed(3)} kg ({Math.max(0, selectedAvailableKg * 1000).toLocaleString()} g)</p>}</div>
        <div><label htmlFor="feeding-grams" className={labelClass}>Amount <span className="text-danger">*</span></label><div className="flex items-center gap-2"><input id="feeding-grams" required type="number" min="0" max={form.unit === "kg" ? 100 : 100000} step="any" className={inputClass} value={form.grams} onChange={(event) => set("grams", event.target.value)} placeholder="0" /><div className="flex shrink-0 rounded-full border border-line p-0.5" aria-label="Amount unit">{(["g", "kg"] as const).map((unit) => <button key={unit} type="button" aria-pressed={form.unit === unit} onClick={() => { if (unit !== form.unit) { const amount = Number(form.grams); set("grams", form.grams && Number.isFinite(amount) ? String(unit === "kg" ? amount / 1000 : amount * 1000) : form.grams); set("unit", unit) } }} className={`rounded-full px-3 py-1.5 text-xs font-bold ${form.unit === unit ? "bg-positive text-white" : "text-muted hover:bg-canvas"}`}>{unit}</button>)}</div></div></div>
        <div className="md:col-span-2"><label htmlFor="feeding-noted" className={labelClass}>NOTES</label><textarea id="feeding-noted" rows={4} maxLength={4000} className={inputClass} value={form.noted} onChange={(event) => set("noted", event.target.value)} placeholder="Additional feeding observations…" /></div>
      </Panel>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Link to="/feeding" className="button-secondary">Cancel</Link><button type="submit" disabled={saving || dogs.length === 0 || handlers.length === 0} className="button-primary">{saving ? "Saving…" : id ? "Save changes" : "Create feeding record"}</button></div>
    </>}
  </form></AppShell>
}