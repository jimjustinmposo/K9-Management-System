import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
const select = `SELECT c.*, k.dog_name, k.nick_name FROM k9_car_usage c JOIN k9_roster k ON k.id=c.k9_id AND k.workspace_id=c.workspace_id`

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view"); if (isResponse(session)) return session
  try {
    const row = await context.env.DB.prepare(`${select} WHERE c.id=? AND c.workspace_id=?`).bind(context.params.id as string, session.workspace.id).first()
    return row ? json({ data: row }) : json({ error: "Car usage record not found" }, 404)
  } catch { return json({ error: "Failed to load car usage record" }, 500) }
}

export const onRequestPut: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "edit"); if (isResponse(session)) return session
  try {
    const body = await context.request.json() as Record<string, unknown>
    const id = context.params.id as string, k9Id = clean(body.k9_id), date = clean(body.date), driver = clean(body.driver), timeIn = clean(body.time_in), timeOut = clean(body.time_out)
    const kmStart = Number(body.km_start), kmEnd = Number(body.km_end)
    if (!k9Id) return json({ error: "Select a registered K9" }, 400)
    if (!validDate(date)) return json({ error: "Enter a valid date" }, 400)
    if (!driver || driver.length > 200) return json({ error: "Enter a driver name (200 characters maximum)" }, 400)
    if (!validTime(timeIn) || !validTime(timeOut)) return json({ error: "Enter valid in and out times" }, 400)
    if (!Number.isFinite(kmStart) || kmStart < 0 || !Number.isFinite(kmEnd) || kmEnd < kmStart) return json({ error: "KM end must be greater than or equal to KM start" }, 400)
    const [existing, k9] = await Promise.all([
      context.env.DB.prepare("SELECT id FROM k9_car_usage WHERE id=? AND workspace_id=?").bind(id, session.workspace.id).first(),
      context.env.DB.prepare("SELECT id FROM k9_roster WHERE id=? AND workspace_id=?").bind(k9Id, session.workspace.id).first(),
    ])
    if (!existing) return json({ error: "Car usage record not found" }, 404)
    if (!k9) return json({ error: "Selected K9 is not available in this workspace" }, 400)
    const kmUsed = kmEnd - kmStart
    await context.env.DB.prepare("UPDATE k9_car_usage SET k9_id=?,date=?,driver=?,time_in=?,km_start=?,time_out=?,km_end=?,km_used=?,updated_at=? WHERE id=? AND workspace_id=?")
      .bind(k9Id, date, driver, timeIn, kmStart, timeOut, kmEnd, kmUsed, new Date().toISOString(), id, session.workspace.id).run()
    const row = await context.env.DB.prepare(`${select} WHERE c.id=? AND c.workspace_id=?`).bind(id, session.workspace.id).first()
    return json({ data: row })
  } catch { return json({ error: "Failed to update car usage record" }, 500) }
}

export const onRequestDelete: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "delete"); if (isResponse(session)) return session
  try {
    const result = await context.env.DB.prepare("DELETE FROM k9_car_usage WHERE id=? AND workspace_id=?").bind(context.params.id as string, session.workspace.id).run()
    return result.meta?.changes ? json({ success: true }) : json({ error: "Car usage record not found" }, 404)
  } catch { return json({ error: "Could not delete car usage record" }, 500) }
}