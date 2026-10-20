import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
const select = `SELECT g.*, k.dog_name, k.nick_name FROM k9_grooming g JOIN k9_roster k ON k.id = g.k9_id AND k.workspace_id = g.workspace_id`

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view"); if (isResponse(session)) return session
  const params = new URL(context.request.url).searchParams
  const search = params.get("search")?.trim() ?? ""
  const limit = Math.max(1, Math.min(200, Number(params.get("limit")) || 50))
  const offset = Math.max(0, Number(params.get("offset")) || 0)
  const where = ["g.workspace_id = ?"]
  const values: (string | number)[] = [session.workspace.id]
  if (search) { where.push("(k.dog_name LIKE ? OR k.nick_name LIKE ?)"); values.push(`%${search}%`, `%${search}%`) }
  try {
    const clause = where.join(" AND ")
    const [rows, count] = await Promise.all([
      context.env.DB.prepare(`${select} WHERE ${clause} ORDER BY g.date DESC, g.created_at DESC LIMIT ? OFFSET ?`).bind(...values, limit, offset).all(),
      context.env.DB.prepare(`SELECT COUNT(*) AS total FROM k9_grooming g JOIN k9_roster k ON k.id=g.k9_id AND k.workspace_id=g.workspace_id WHERE ${clause}`).bind(...values).first<{ total: number }>(),
    ])
    return json({ data: rows.results ?? [], total: Number(count?.total ?? 0) })
  } catch { return json({ error: "Failed to load grooming records" }, 500) }
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "create"); if (isResponse(session)) return session
  try {
    const body = await context.request.json() as Record<string, unknown>
    const k9Id = clean(body.k9_id), date = clean(body.date), ears = clean(body.ears)
    const price = Number(body.price)
    if (!k9Id) return json({ error: "Select a registered K9" }, 400)
    if (!validDate(date)) return json({ error: "Enter a valid grooming date" }, 400)
    if (!Number.isFinite(price) || price < 0) return json({ error: "Price must be zero or more" }, 400)
    if (ears.length > 2000) return json({ error: "Ear notes must be 2000 characters or fewer" }, 400)
    const k9 = await context.env.DB.prepare("SELECT id FROM k9_roster WHERE id=? AND workspace_id=?").bind(k9Id, session.workspace.id).first()
    if (!k9) return json({ error: "Selected K9 is not available in this workspace" }, 400)
    const bool = (value: unknown) => value === true || value === 1 || value === "1" ? 1 : 0
    const id = crypto.randomUUID(), now = new Date().toISOString()
    await context.env.DB.prepare("INSERT INTO k9_grooming (id,k9_id,date,bathing,nails,ears,brushing,price,workspace_id,created_by_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id, k9Id, date, bool(body.bathing), bool(body.nails), ears, bool(body.brushing), price, session.workspace.id, session.user.id, now, now).run()
    const row = await context.env.DB.prepare(`${select} WHERE g.id=? AND g.workspace_id=?`).bind(id, session.workspace.id).first()
    return json({ data: row }, 201)
  } catch { return json({ error: "Failed to create grooming record" }, 500) }
}