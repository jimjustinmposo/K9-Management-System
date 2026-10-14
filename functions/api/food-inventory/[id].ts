import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
const select = `SELECT i.id, i.date, i.item, i.brand, i.amount,
  COALESCE((SELECT SUM(f.grams) / 1000.0 FROM k9feeding f WHERE f.workspace_id = i.workspace_id AND LOWER(TRIM(f.food)) = LOWER(TRIM(i.item))), 0) AS used,
  i.amount - COALESCE((SELECT SUM(f.grams) / 1000.0 FROM k9feeding f WHERE f.workspace_id = i.workspace_id AND LOWER(TRIM(f.food)) = LOWER(TRIM(i.item))), 0) AS remaining,
  i.created_at, i.updated_at FROM k9_food_inventory i`

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view"); if (isResponse(session)) return session
  try {
    const row = await context.env.DB.prepare(`${select} WHERE i.id = ? AND i.workspace_id = ?`).bind(context.params.id as string, session.workspace.id).first()
    return row ? json({ data: row }) : json({ error: "Food inventory record not found" }, 404)
  } catch { return json({ error: "Failed to load food inventory record" }, 500) }
}

export const onRequestPut: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "edit"); if (isResponse(session)) return session
  try {
    const id = context.params.id as string, body = await context.request.json() as Record<string, unknown>
    const date = clean(body.date), item = clean(body.item), brand = clean(body.brand), amount = Number(body.amount)
    if (!validDate(date)) return json({ error: "Enter a valid stock date" }, 400)
    if (!item || item.length > 200) return json({ error: "Food item is required (maximum 200 characters)" }, 400)
    if (brand.length > 200) return json({ error: "Brand must be 200 characters or fewer" }, 400)
    if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) return json({ error: "Enter a valid amount in kg" }, 400)
    const result = await context.env.DB.prepare("UPDATE k9_food_inventory SET date = ?, item = ?, brand = ?, amount = ?, updated_at = ? WHERE id = ? AND workspace_id = ?")
      .bind(date, item, brand, amount, new Date().toISOString(), id, session.workspace.id).run()
    if (!result.meta?.changes) return json({ error: "Food inventory record not found" }, 404)
    return json({ data: await context.env.DB.prepare(`${select} WHERE i.id = ? AND i.workspace_id = ?`).bind(id, session.workspace.id).first() })
  } catch { return json({ error: "Failed to update food inventory" }, 500) }
}

export const onRequestDelete: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "delete"); if (isResponse(session)) return session
  try {
    const result = await context.env.DB.prepare("DELETE FROM k9_food_inventory WHERE id = ? AND workspace_id = ?")
      .bind(context.params.id as string, session.workspace.id).run()
    return result.meta?.changes ? json({ success: true }) : json({ error: "Food inventory record not found" }, 404)
  } catch { return json({ error: "Failed to delete food inventory record" }, 500) }
}