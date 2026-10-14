import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const select = `SELECT w.id, w.date, w.dog_id, w.nickname, w.weight, w.difference, w.workspace_id, w.created_at, w.updated_at, k.dog_name FROM k9weights w JOIN k9_roster k ON k.id = w.dog_id AND k.workspace_id = w.workspace_id`
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session
  try {
    const row = await context.env.DB.prepare(`${select} WHERE w.id = ? AND w.workspace_id = ?`).bind(context.params.id as string, session.workspace.id).first()
    return row ? json({ data: row }) : json({ error: "Weight record not found" }, 404)
  } catch { return json({ error: "Failed to load weight record" }, 500) }
}

export const onRequestPut: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "edit")
  if (isResponse(session)) return session
  try {
    const id = context.params.id as string
    const body = await context.request.json() as Record<string, unknown>
    const date = clean(body.date), weight = Number(body.weight)
    if (!validDate(date)) return json({ error: "Enter a valid weight date" }, 400)
    if (!Number.isFinite(weight) || weight <= 0 || weight > 1000) return json({ error: "Enter a valid weight in kg (greater than 0 and no more than 1000)" }, 400)
    const current = await context.env.DB.prepare("SELECT dog_id, created_at FROM k9weights WHERE id = ? AND workspace_id = ?").bind(id, session.workspace.id).first<{ dog_id: string; created_at: string }>()
    if (!current) return json({ error: "Weight record not found" }, 404)
    const previous = await context.env.DB.prepare("SELECT weight FROM k9weights WHERE dog_id = ? AND workspace_id = ? AND id != ? AND (date < ? OR (date = ? AND created_at < ?)) ORDER BY date DESC, created_at DESC LIMIT 1")
      .bind(current.dog_id, session.workspace.id, id, date, date, current.created_at).first<{ weight: number }>()
    const difference = previous ? weight - Number(previous.weight) : null
    const result = await context.env.DB.prepare("UPDATE k9weights SET date = ?, weight = ?, difference = ?, updated_at = ? WHERE id = ? AND workspace_id = ?")
      .bind(date, weight, difference, new Date().toISOString(), id, session.workspace.id).run()
    if (!result.meta?.changes) return json({ error: "Weight record not found" }, 404)
    return json({ data: await context.env.DB.prepare(`${select} WHERE w.id = ? AND w.workspace_id = ?`).bind(id, session.workspace.id).first() })
  } catch { return json({ error: "Failed to update weight record" }, 500) }
}

export const onRequestDelete: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "delete")
  if (isResponse(session)) return session
  try {
    const result = await context.env.DB.prepare("DELETE FROM k9weights WHERE id = ? AND workspace_id = ?").bind(context.params.id as string, session.workspace.id).run()
    return result.meta?.changes ? json({ success: true }) : json({ error: "Weight record not found" }, 404)
  } catch { return json({ error: "Failed to delete weight record" }, 500) }
}