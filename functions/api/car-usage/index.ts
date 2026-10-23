import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
const select = `SELECT c.*, k.dog_name, k.nick_name FROM k9_car_usage c LEFT JOIN k9_roster k ON k.id=c.k9_id AND k.workspace_id=c.workspace_id`

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view"); if (isResponse(session)) return session
  const params = new URL(context.request.url).searchParams
  const search = params.get("search")?.trim() ?? ""
  const limit = Math.max(1, Math.min(200, Number(params.get("limit")) || 50))
  const offset = Math.max(0, Number(params.get("offset")) || 0)
  const where = ["c.workspace_id = ?"]
  const values: (string | number)[] = [session.workspace.id]
  if (search) { where.push("(c.driver LIKE ? OR c.notes LIKE ? OR k.dog_name LIKE ? OR k.nick_name LIKE ?)"); values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`) }
  try {
    const clause = where.join(" AND ")
    const [rows, count] = await Promise.all([
      context.env.DB.prepare(`${select} WHERE ${clause} ORDER BY c.date DESC, c.created_at DESC LIMIT ? OFFSET ?`).bind(...values, limit, offset).all(),
      context.env.DB.prepare(`SELECT COUNT(*) AS total FROM k9_car_usage c LEFT JOIN k9_roster k ON k.id=c.k9_id AND k.workspace_id=c.workspace_id WHERE ${clause}`).bind(...values).first<{ total: number }>(),
    ])
    return json({ data: rows.results ?? [], total: Number(count?.total ?? 0) })
  } catch { return json({ error: "Failed to load car usage records" }, 500) }
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "create"); if (isResponse(session)) return session
  try {
    const body = await context.request.json() as Record<string, unknown>
    const notes = clean(body.notes), date = clean(body.date), driver = clean(body.driver), timeIn = clean(body.time_in), timeOut = clean(body.time_out)
    const kmStart = Number(body.km_start), kmEnd = Number(body.km_end)
    if (notes.length > 2000) return json({ error: "Notes must be 2000 characters or fewer" }, 400)
    if (!validDate(date)) return json({ error: "Enter a valid date" }, 400)
    if (!driver || driver.length > 200) return json({ error: "Enter a driver name (200 characters maximum)" }, 400)
    if (!validTime(timeIn) || !validTime(timeOut)) return json({ error: "Enter valid in and out times" }, 400)
    if (!Number.isFinite(kmStart) || kmStart < 0 || !Number.isFinite(kmEnd) || kmEnd < kmStart) return json({ error: "KM end must be greater than or equal to KM start" }, 400)
    const id = crypto.randomUUID(), now = new Date().toISOString()
    const kmUsed = kmEnd - kmStart
    await context.env.DB.prepare("INSERT INTO k9_car_usage (id,notes,date,driver,time_in,km_start,time_out,km_end,km_used,workspace_id,created_by_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id, notes, date, driver, timeIn, kmStart, timeOut, kmEnd, kmUsed, session.workspace.id, session.user.id, now, now).run()
    const row = await context.env.DB.prepare(`${select} WHERE c.id=? AND c.workspace_id=?`).bind(id, session.workspace.id).first()
    return json({ data: row }, 201)
  } catch { return json({ error: "Failed to create car usage record" }, 500) }
}