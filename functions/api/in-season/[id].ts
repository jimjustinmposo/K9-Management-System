import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session
  try {
    const row = await context.env.DB.prepare("SELECT s.*, k.dog_name, k.nick_name, k.breed, k.profile_photo FROM k9_seasons s JOIN k9_roster k ON k.id=s.k9_id AND k.workspace_id=s.workspace_id WHERE s.id=? AND s.workspace_id=?").bind(context.params.id as string, session.workspace.id).first()
    return row ? json({ data: row }) : json({ error: "Season record not found" }, 404)
  } catch { return json({ error: "Failed to load season record" }, 500) }
}

export const onRequestPut: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "edit")
  if (isResponse(session)) return session
  try {
    const id = context.params.id as string
    const body = await context.request.json() as Record<string, unknown>
    const k9Id = clean(body.k9_id)
    const startDate = clean(body.start_date)
    const endDate = clean(body.end_date)
    if (!k9Id || !validDate(startDate)) return json({ error: "Select a K9 and enter a valid season start date" }, 400)
    if (endDate && (!validDate(endDate) || endDate < startDate)) return json({ error: "Season end date must be on or after its start date" }, 400)
    const [existing, k9] = await Promise.all([
      context.env.DB.prepare("SELECT id FROM k9_seasons WHERE id=? AND workspace_id=?").bind(id, session.workspace.id).first(),
      context.env.DB.prepare("SELECT id FROM k9_roster WHERE id=? AND workspace_id=?").bind(k9Id, session.workspace.id).first(),
    ])
    if (!existing) return json({ error: "Season record not found" }, 404)
    if (!k9) return json({ error: "Register this dog in the K9 Roster first" }, 400)
    await context.env.DB.prepare("UPDATE k9_seasons SET k9_id=?, start_date=?, end_date=?, status=?, notes=?, updated_at=? WHERE id=? AND workspace_id=?")
      .bind(k9Id, startDate, endDate, endDate ? "Ended" : "Active", clean(body.notes), new Date().toISOString(), id, session.workspace.id).run()
    const row = await context.env.DB.prepare("SELECT s.*, k.dog_name, k.nick_name, k.breed, k.profile_photo FROM k9_seasons s JOIN k9_roster k ON k.id=s.k9_id AND k.workspace_id=s.workspace_id WHERE s.id=? AND s.workspace_id=?").bind(id, session.workspace.id).first()
    return json({ data: row })
  } catch { return json({ error: "Failed to update season record" }, 500) }
}

export const onRequestDelete: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "delete")
  if (isResponse(session)) return session
  try {
    const result = await context.env.DB.prepare("DELETE FROM k9_seasons WHERE id=? AND workspace_id=?").bind(context.params.id as string, session.workspace.id).run()
    return Number(result.meta.changes) ? json({ success: true }) : json({ error: "Season record not found" }, 404)
  } catch { return json({ error: "Failed to delete season record" }, 500) }
}