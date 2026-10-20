import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session
  const params = new URL(context.request.url).searchParams
  const k9Id = params.get("k9_id")?.trim() ?? ""
  const status = params.get("status")?.trim() ?? ""
  const search = params.get("search")?.trim() ?? ""
  const limit = Math.max(1, Math.min(200, Number(params.get("limit")) || 200))
  const offset = Math.max(0, Number(params.get("offset")) || 0)
  const where = ["s.workspace_id = ?"]
  const values: (string | number)[] = [session.workspace.id]
  if (k9Id) { where.push("s.k9_id = ?"); values.push(k9Id) }
  if (status && ["Active", "Ended"].includes(status)) { where.push("s.status = ?"); values.push(status) }
  if (search) { where.push("(k.dog_name LIKE ? OR k.nick_name LIKE ?)"); values.push(`%${search}%`, `%${search}%`) }
  try {
    const clause = where.join(" AND ")
    const [rows, count] = await Promise.all([
      context.env.DB.prepare(`SELECT s.*, k.dog_name, k.nick_name, k.breed, k.profile_photo FROM k9_seasons s JOIN k9_roster k ON k.id = s.k9_id AND k.workspace_id = s.workspace_id WHERE ${clause} ORDER BY s.start_date DESC, s.created_at DESC LIMIT ? OFFSET ?`).bind(...values, limit, offset).all(),
      context.env.DB.prepare(`SELECT COUNT(*) AS total FROM k9_seasons s JOIN k9_roster k ON k.id = s.k9_id AND k.workspace_id = s.workspace_id WHERE ${clause}`).bind(...values).first<{ total: number }>(),
    ])
    return json({ data: rows.results ?? [], total: Number(count?.total ?? 0) })
  } catch {
    return json({ error: "Failed to load season records" }, 500)
  }
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "create")
  if (isResponse(session)) return session
  try {
    const body = await context.request.json() as Record<string, unknown>
    const k9Id = clean(body.k9_id)
    const startDate = clean(body.start_date)
    const endDate = clean(body.end_date)
    if (!k9Id) return json({ error: "Select a registered K9" }, 400)
    if (!validDate(startDate)) return json({ error: "Enter a valid season start date" }, 400)
    if (endDate && (!validDate(endDate) || endDate < startDate)) return json({ error: "Season end date must be on or after its start date" }, 400)
    const k9 = await context.env.DB.prepare("SELECT id FROM k9_roster WHERE id = ? AND workspace_id = ?").bind(k9Id, session.workspace.id).first()
    if (!k9) return json({ error: "Register this dog in the K9 Roster first" }, 400)
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    await context.env.DB.prepare(`INSERT INTO k9_seasons (id,k9_id,start_date,end_date,status,notes,workspace_id,created_by_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, k9Id, startDate, endDate, endDate ? "Ended" : "Active", clean(body.notes), session.workspace.id, session.user.id, now, now).run()
    const row = await context.env.DB.prepare("SELECT s.*, k.dog_name, k.nick_name, k.breed, k.profile_photo FROM k9_seasons s JOIN k9_roster k ON k.id=s.k9_id AND k.workspace_id=s.workspace_id WHERE s.id=? AND s.workspace_id=?").bind(id, session.workspace.id).first()
    return json({ data: row }, 201)
  } catch {
    return json({ error: "Failed to create season record" }, 500)
  }
}