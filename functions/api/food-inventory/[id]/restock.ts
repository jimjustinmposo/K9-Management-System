import { isResponse, requireSession, type AppEnv } from "../../../_lib/auth"
import { json } from "../../../_lib/http"

const select = `SELECT i.id, i.date, i.item, i.brand, i.amount,
  COALESCE((SELECT SUM(f.grams) / 1000.0 FROM k9feeding f WHERE f.workspace_id = i.workspace_id AND LOWER(TRIM(f.food)) = LOWER(TRIM(i.item))), 0) AS used,
  i.amount - COALESCE((SELECT SUM(f.grams) / 1000.0 FROM k9feeding f WHERE f.workspace_id = i.workspace_id AND LOWER(TRIM(f.food)) = LOWER(TRIM(i.item))), 0) AS remaining,
  i.created_at, i.updated_at FROM k9_food_inventory i`

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "create")
  if (isResponse(session)) return session
  try {
    const body = await context.request.json() as Record<string, unknown>
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return json({ error: "Enter a stock amount greater than zero and no more than 1,000,000 kg" }, 400)
    const id = context.params.id as string
    const result = await context.env.DB.prepare("UPDATE k9_food_inventory SET amount = amount + ?, updated_at = ? WHERE id = ? AND workspace_id = ?")
      .bind(amount, new Date().toISOString(), id, session.workspace.id).run()
    if (!result.meta?.changes) return json({ error: "Food inventory record not found" }, 404)
    return json({ data: await context.env.DB.prepare(`${select} WHERE i.id = ? AND i.workspace_id = ?`).bind(id, session.workspace.id).first() })
  } catch { return json({ error: "Failed to add food stock" }, 500) }
}