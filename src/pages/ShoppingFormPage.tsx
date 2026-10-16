import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AppShell, Panel } from "../components/AppShell"
import { useAuth } from "../lib/auth"
import { foodInventoryApi } from "../lib/foodInventoryApi"
import { shoppingApi } from "../lib/shoppingApi"
import { EMPTY_SHOPPING_FORM, type ShoppingFormValues, type ShoppingType } from "../types/shopping"
import type { FoodInventoryRecord } from "../types/foodInventory"

const inputClass = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-positive focus-visible:ring-2 focus-visible:ring-positive/30"
const labelClass = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate"

export default function ShoppingFormPage() {
  const { id } = useParams<{ id: string }>(), navigate = useNavigate(), { session } = useAuth()
  const [form, setForm] = useState<ShoppingFormValues>(EMPTY_SHOPPING_FORM)
  const [foods, setFoods] = useState<FoodInventoryRecord[]>([])
  const [foodSearchLoading, setFoodSearchLoading] = useState(false)
  const [loading, setLoading] = useState(Boolean(id)), [saving, setSaving] = useState(false), [error, setError] = useState("")
  useEffect(() => {
    let active = true
    if (id) void shoppingApi.get(id).then((record) => {
      if (active) setForm({ date: record.date.slice(0, 10), type: record.type, item: record.item, brand: "", description: record.description, quantity: String(record.quantity), price: String(record.price) })
    }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not load shopping record.") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  useEffect(() => {
    const query = form.type === "food" ? form.item.trim() : ""
    let active = true
    if (query.length < 2) {
      setFoods([])
      setFoodSearchLoading(false)
      return () => { active = false }
    }
    setFoodSearchLoading(true)
    const timer = window.setTimeout(() => {
      void foodInventoryApi.page(query, 5, 0)
        .then((result) => { if (active) setFoods(result.data) })
        .catch(() => { if (active) setFoods([]) })
        .finally(() => { if (active) setFoodSearchLoading(false) })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [form.item, form.type])
  function set<K extends keyof ShoppingFormValues>(key: K, value: ShoppingFormValues[K]) { setForm((current) => ({ ...current, [key]: value })) }
  function setType(type: ShoppingType) { setForm((current) => ({ ...current, type, item: type === "food" ? current.item : "" })) }
  function chooseFood(food: { item: string; brand: string }) {
    setForm((current) => ({ ...current, item: food.item, brand: food.brand }))
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("")
    try { if (id) await shoppingApi.update(id, form); else await shoppingApi.create(form); navigate("/shopping", { replace: true }) }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save shopping record.") }
    finally { setSaving(false) }
  }
  const selectedFood = foods.find((food) => food.item.trim().toLocaleLowerCase() === form.item.trim().toLocaleLowerCase())
  const foodOptions = [...new Map(foods.map((food) => [food.item.trim().toLocaleLowerCase(), { item: food.item, brand: food.brand, remaining: food.remaining }])).values()]
  const matchingFoods = foodOptions
  return <AppShell title={id ? "Edit Shopping Record" : "New Shopping Record"}><form onSubmit={(event) => void submit(event)} className="mx-auto max-w-3xl space-y-5">
    <div><Link to="/shopping" className="rounded px-1 py-1 text-xs font-bold text-positive transition hover:bg-positive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-positive">← Shopping</Link><p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.16em] text-positive">Purchases · register</p><h2 className="mt-1 text-2xl font-bold text-ink">{id ? "Update shopping record" : "Record a purchase"}</h2><p className="mt-1 text-sm text-muted">New food items are added to Food Inventory automatically; existing items receive the purchase quantity in kg.</p></div>
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
    {loading ? <Panel className="p-8 text-center text-sm text-muted">Loading shopping record…</Panel> : <>
      <Panel className="grid gap-4 p-5 md:grid-cols-2">
        <div><label htmlFor="shopping-date" className={labelClass}>Date *</label><input id="shopping-date" type="date" required className={inputClass} value={form.date} onChange={(event) => set("date", event.target.value)} /></div>
        <fieldset><legend className={labelClass}>Type *</legend><div className="flex gap-2">{(["food", "others"] as ShoppingType[]).map((type) => <button key={type} type="button" aria-pressed={form.type === type} onClick={() => setType(type)} className={`rounded-full border px-4 py-2 text-sm font-bold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-positive ${form.type === type ? "border-positive bg-positive text-white shadow-sm" : "border-line bg-surface text-muted hover:border-positive hover:text-positive"}`}>{type}</button>)}</div></fieldset>
        <div className="md:col-span-2"><label htmlFor="shopping-item" className={labelClass}>Item *</label><input id="shopping-item" required maxLength={200} className={inputClass} value={form.item} onChange={(event) => {
          const item = event.target.value
          const exactMatch = foods.find((food) => food.item.trim().toLocaleLowerCase() === item.trim().toLocaleLowerCase())
          setForm((current) => ({ ...current, item, brand: exactMatch?.brand ?? "" }))
        }} placeholder={form.type === "food" ? "Type a food name; choose a match or add a new one" : "Type an item name"} />{form.type === "food" && <>
          <div className="mt-2 space-y-1" aria-label="Food inventory matches">{form.item.trim().length < 2 ? <p className="rounded-lg border border-dashed border-line px-3 py-2 text-xs text-muted">Type at least 2 letters to search Food Inventory.</p> : foodSearchLoading ? <p className="px-1 py-2 text-xs text-muted" role="status">Searching Food Inventory…</p> : matchingFoods.length ? matchingFoods.map((food) => <button key={food.item.toLocaleLowerCase()} type="button" onClick={() => chooseFood(food)} aria-pressed={selectedFood?.item === food.item} className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-positive ${selectedFood?.item === food.item ? "border-positive bg-positive-soft text-positive" : "border-line bg-surface text-ink hover:border-positive hover:bg-positive-soft"}`}><span className="font-semibold">{food.item}{food.brand ? <span className="ml-1 font-normal text-muted">({food.brand})</span> : null}</span><span className="shrink-0 text-xs text-muted">{food.remaining.toFixed(3)} kg remaining</span></button>) : <p className="rounded-lg border border-dashed border-line px-3 py-2 text-xs text-muted">No matching inventory food. Saving will add “{form.item.trim()}” as a new food item.</p>}</div>
          {selectedFood && <p role="status" className="mt-2 rounded-lg border border-positive/30 bg-positive-soft px-3 py-2 text-xs font-semibold text-positive">Connected to Food Inventory · {selectedFood.remaining.toFixed(3)} kg remaining · this purchase adds {Number(form.quantity || 0).toFixed(3)} kg</p>}
          {!selectedFood && form.item.trim() && matchingFoods.length > 0 && <p role="status" className="mt-2 text-xs text-muted">Choose a matching inventory item above, or keep typing to add “{form.item.trim()}” as new food.</p>}
          {!form.item.trim() && <p className="mt-2 text-xs text-muted">Type to see matching Food Inventory items, or enter a new name to create one when saved.</p>}
        </>}</div>
        {form.type === "food" && <div><label htmlFor="shopping-brand" className={labelClass}>Brand {selectedFood ? "(from Food Inventory)" : "(for new food)"}</label><input id="shopping-brand" maxLength={200} readOnly={Boolean(selectedFood)} className={`${inputClass} ${selectedFood ? "cursor-not-allowed opacity-75" : ""}`} value={selectedFood?.brand || form.brand || ""} onChange={(event) => set("brand", event.target.value)} placeholder={selectedFood ? "No brand recorded for this food" : "Optional brand"} /><p className="mt-1 text-xs text-muted">{selectedFood ? "Fetched from the selected Food Inventory record." : "For a new food item, an optional brand will be saved with its inventory record."}</p></div>}
        <div className="md:col-span-2"><label htmlFor="shopping-description" className={labelClass}>Description</label><textarea id="shopping-description" maxLength={4000} rows={3} className={inputClass} value={form.description} onChange={(event) => set("description", event.target.value)} /></div>
        <div><label htmlFor="shopping-quantity" className={labelClass}>Quantity {form.type === "food" ? "(kg)" : ""} *</label><input id="shopping-quantity" required type="number" min="0" max="1000000" step="any" className={inputClass} value={form.quantity} onChange={(event) => set("quantity", event.target.value)} /></div>
        <div><label htmlFor="shopping-price" className={labelClass}>Price per unit *</label><input id="shopping-price" required type="number" min="0" max="100000000" step="any" className={inputClass} value={form.price} onChange={(event) => set("price", event.target.value)} /></div>
        <p className="text-sm font-bold text-ink md:col-span-2">Total: {(Number(form.quantity || 0) * Number(form.price || 0)).toFixed(2)}</p>
      </Panel>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Link to="/shopping" className="button-secondary">Cancel</Link><button type="submit" disabled={saving || !session?.subscription.writable} className="button-primary transition active:scale-[.98]">{saving ? "Saving…" : id ? "Save changes" : "Add to Shopping"}</button></div>
    </>}
  </form></AppShell>
}