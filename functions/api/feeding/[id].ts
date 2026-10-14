import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
const select = `SELECT f.id, f.date, f.dog, f.handler, f.food, f.grams, f.noted, f.created_at, f.updated_at, k.dog_name, h.full_name AS handler_name FROM k9feeding f JOIN k9_roster k ON k.id = f.dog AND k.workspace_id = f.workspace_id JOIN k9_handlers h ON h.id = f.handler AND h.workspace_id = f.workspace_id`

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view"); if (isResponse(session)) return session
  try {
    const row = await context.env.DB.prepare(`${select} WHERE f.id = ? AND f.workspace_id = ?`).bind(context.params.id as string, session.workspace.id).first()
    return row ? json({ data: row }) : json({ error: "Feeding record not found" }, 404)
  } catch { return json({ error: "Failed to load feeding record" }, 500) }
}

export const onRequestPut: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "edit"); if (isResponse(session)) return session
  try {
    const id = context.params.id as string, body = await context.request.json() as Record<string, unknown>
    const date = clean(body.date), dog = clean(body.dog), handler = clean(body.handler), food = clean(body.food), noted = clean(body.noted), grams = Number(body.grams)
    if (!validDate(date)) return json({ error: "Enter a valid feeding date" }, 400)
    if (!dog || !handler) return json({ error: "Select a dog and handler" }, 400)
    if (!food || food.length > 200) return json({ error: "Food is required (maximum 200 characters)" }, 400)
    if (!Number.isFinite(grams) || grams < 0 || grams > 100000) return json({ error: "Enter a valid amount in grams" }, 400)
    if (noted.length > 4000) return json({ error: "Notes must be 4000 characters or fewer" }, 400)
    const [existing, k9, team] = await Promise.all([
      context.env.DB.prepare("SELECT id, food, grams FROM k9feeding WHERE id = ? AND workspace_id = ?").bind(id, session.workspace.id).first<{ id: string; food: string; grams: number }>(),
      context.env.DB.prepare("SELECT id FROM k9_roster WHERE id = ? AND workspace_id = ?").bind(dog, session.workspace.id).first(),
      context.env.DB.prepare("SELECT id FROM k9_handlers WHERE id = ? AND workspace_id = ?").bind(handler, session.workspace.id).first(),
    ])
    if (!existing) return json({ error: "Feeding record not found" }, 404)
    if (!k9 || !team) return json({ error: "Selected dog or handler is not available in this workspace" }, 400)
    const stock = await context.env.DB.prepare(`SELECT COUNT(*) AS entries, COALESCE(SUM(i.amount), 0) - COALESCE((SELECT SUM(f.grams) / 1000.0 FROM k9feeding f WHERE f.workspace_id = i.workspace_id AND LOWER(TRIM(f.food)) = LOWER(TRIM(i.item)) AND f.id != ?), 0) AS available FROM k9_food_inventory i WHERE i.workspace_id = ? AND LOWER(TRIM(i.item)) = LOWER(TRIM(?))`).bind(id, session.workspace.id, food).first<{ entries: number; available: number }>()
    if (!stock?.entries) return json({ error: `Food “${food}” is not in the food inventory. Add it to Food Inventory before saving this feeding.` }, 400)
    const availableGrams = Number(stock.available) * 1000
    if (grams > availableGrams) return json({ error: `Insufficient inventory for “${food}”: only ${Math.max(0, Number(stock.available)).toFixed(3)} kg (${Math.max(0, availableGrams).toLocaleString()} g) remains. Please add stock or reduce the portion to ${Math.max(0, availableGrams).toLocaleString()} g or less.` }, 400)
    await context.env.DB.prepare("UPDATE k9feeding SET date = ?, dog = ?, handler = ?, food = ?, grams = ?, noted = ?, updated_at = ? WHERE id = ? AND workspace_id = ?")
      .bind(date, dog, handler, food, grams, noted, new Date().toISOString(), id, session.workspace.id).run()
    return json({ data: await context.env.DB.prepare(`${select} WHERE f.id = ? AND f.workspace_id = ?`).bind(id, session.workspace.id).first() })
  } catch { return json({ error: "Failed to update feeding record" }, 500) }
}

export const onRequestDelete: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "delete"); if (isResponse(session)) return session
  try {
    const result = await context.env.DB.prepare("DELETE FROM k9feeding WHERE id = ? AND workspace_id = ?").bind(context.params.id as string, session.workspace.id).run()
    return result.meta?.changes ? json({ success: true }) : json({ error: "Feeding record not found" }, 404)
  } catch { return json({ error: "Failed to delete feeding record" }, 500) }
}