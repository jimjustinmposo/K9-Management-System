import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
const select = `SELECT g.*, k.dog_name, k.nick_name FROM k9_grooming g JOIN k9_roster k ON k.id=g.k9_id AND k.workspace_id=g.workspace_id`
const bool = (value: unknown) => value === true || value === 1 || value === "1" ? 1 : 0

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view"); if (isResponse(session)) return session
  try {
    const row = await context.env.DB.prepare(`${select} WHERE g.id=? AND g.workspace_id=?`).bind(context.params.id as string, session.workspace.id).first()
    return row ? json({ data: row }) : json({ error: "Grooming record not found" }, 404)
  } catch { return json({ error: "Failed to load grooming record" }, 500) }
}

export const onRequestPatch: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "create"); if (isResponse(session)) return session
  try {
    const body = await context.request.json() as Record<string, unknown>
    const keys = body ? Object.keys(body) : []
    if (keys.length !== 1 || !["bathing", "nails", "brushing"].includes(keys[0]) || typeof body[keys[0]] !== "boolean") return json({ error: "Select one grooming checkbox to update" }, 400)
    const field = keys[0], id = context.params.id as string
    const result = await context.env.DB.prepare(`UPDATE k9_grooming SET ${field}=?, updated_at=? WHERE id=? AND workspace_id=?`)
      .bind(body[field] ? 1 : 0, new Date().toISOString(), id, session.workspace.id).run()
    if (!result.meta.changes) return json({ error: "Grooming record not found" }, 404)
    const row = await context.env.DB.prepare(`${select} WHERE g.id=? AND g.workspace_id=?`).bind(id, session.workspace.id).first()
    return json({ data: row })
  } catch { return json({ error: "Could not update grooming checkbox" }, 500) }
}

export const onRequestPut: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "edit"); if (isResponse(session)) return session
  try {
    const body = await context.request.json() as Record<string, unknown>
    const id = context.params.id as string, k9Id = clean(body.k9_id), date = clean(body.date), ears = clean(body.ears), price = Number(body.price)
    if (!k9Id) return json({ error: "Select a registered K9" }, 400)
    if (!validDate(date)) return json({ error: "Enter a valid grooming date" }, 400)
    if (!Number.isFinite(price) || price < 0) return json({ error: "Price must be zero or more" }, 400)
    if (ears.length > 2000) return json({ error: "Ear notes must be 2000 characters or fewer" }, 400)
    const [existing, k9] = await Promise.all([
      context.env.DB.prepare("SELECT id FROM k9_grooming WHERE id=? AND workspace_id=?").bind(id, session.workspace.id).first(),
      context.env.DB.prepare("SELECT id FROM k9_roster WHERE id=? AND workspace_id=?").bind(k9Id, session.workspace.id).first(),
    ])
    if (!existing) return json({ error: "Grooming record not found" }, 404)
    if (!k9) return json({ error: "Selected K9 is not available in this workspace" }, 400)
    await context.env.DB.prepare("UPDATE k9_grooming SET k9_id=?,date=?,bathing=?,nails=?,ears=?,brushing=?,price=?,updated_at=? WHERE id=? AND workspace_id=?")
      .bind(k9Id, date, bool(body.bathing), bool(body.nails), ears, bool(body.brushing), price, new Date().toISOString(), id, session.workspace.id).run()
    const row = await context.env.DB.prepare(`${select} WHERE g.id=? AND g.workspace_id=?`).bind(id, session.workspace.id).first()
    return json({ data: row })
  } catch { return json({ error: "Failed to update grooming record" }, 500) }
}

export const onRequestDelete: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "delete"); if (isResponse(session)) return session
  try {
    const result = await context.env.DB.prepare("DELETE FROM k9_grooming WHERE id=? AND workspace_id=?").bind(context.params.id as string, session.workspace.id).run()
    return result.meta?.changes ? json({ success: true }) : json({ error: "Grooming record not found" }, 404)
  } catch { return json({ error: "Could not delete grooming record" }, 500) }
}