import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
const select = `SELECT w.id, w.date, w.dog_id, w.nickname, w.weight, w.difference, w.workspace_id, w.created_at, w.updated_at, k.dog_name FROM k9weights w JOIN k9_roster k ON k.id = w.dog_id AND k.workspace_id = w.workspace_id`

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session
  const params = new URL(context.request.url).searchParams
  const search = params.get("search")?.trim() ?? ""
  const dogId = params.get("dog_id")?.trim() ?? ""
  const hasPagination = params.has("limit")
  const limit = Math.max(1, Math.min(200, Math.floor(Number(params.get("limit")) || 10)))
  const offset = Math.max(0, Math.floor(Number(params.get("offset")) || 0))
  const where = ["w.workspace_id = ?"]
  const bindings: (string | number)[] = [session.workspace.id]
  if (dogId) { where.push("w.dog_id = ?"); bindings.push(dogId) }
  if (search) { where.push("(k.dog_name LIKE ? OR w.nickname LIKE ?)"); bindings.push(`%${search}%`, `%${search}%`) }
  const from = `FROM k9weights w JOIN k9_roster k ON k.id = w.dog_id AND k.workspace_id = w.workspace_id WHERE ${where.join(" AND ")}`
  try {
    const [rows, count] = await Promise.all([
      context.env.DB.prepare(`SELECT w.id, w.date, w.dog_id, w.nickname, w.weight, w.difference, w.workspace_id, w.created_at, w.updated_at, k.dog_name ${from} ORDER BY w.date DESC, w.created_at DESC${hasPagination ? " LIMIT ? OFFSET ?" : ""}`).bind(...bindings, ...(hasPagination ? [limit, offset] : [])).all(),
      hasPagination ? context.env.DB.prepare(`SELECT COUNT(*) AS total ${from}`).bind(...bindings).first<{ total: number }>() : Promise.resolve(null),
    ])
    return json({ data: rows.results ?? [], ...(hasPagination ? { total: Number(count?.total ?? 0) } : {}) })
  } catch { return json({ error: "Failed to load weight records" }, 500) }
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "create")
  if (isResponse(session)) return session
  try {
    const body = await context.request.json() as Record<string, unknown>
    const date = clean(body.date)
    if (!validDate(date)) return json({ error: "Enter a valid weight date" }, 400)
    if (!Array.isArray(body.entries) || body.entries.length < 1 || body.entries.length > 100) return json({ error: "Select between 1 and 100 dogs" }, 400)
    const entries = body.entries.map((entry) => {
      const row = entry as Record<string, unknown>
      return { dogId: clean(row.dog_id), nickname: clean(row.nickname), weight: Number(row.weight) }
    })
    if (entries.some((entry) => !entry.dogId || entry.nickname.length > 100 || !Number.isFinite(entry.weight) || entry.weight <= 0 || entry.weight > 1000)) return json({ error: "Each dog needs a valid weight in kg (greater than 0 and no more than 1000)" }, 400)
    if (new Set(entries.map((entry) => entry.dogId)).size !== entries.length) return json({ error: "A dog can only be included once per batch" }, 400)
    const placeholders = entries.map(() => "?").join(",")
    const roster = await context.env.DB.prepare(`SELECT id FROM k9_roster WHERE workspace_id = ? AND id IN (${placeholders})`).bind(session.workspace.id, ...entries.map((entry) => entry.dogId)).all<{ id: string }>()
    if ((roster.results ?? []).length !== entries.length) return json({ error: "One or more selected dogs are unavailable in this workspace" }, 400)
    const now = new Date().toISOString()
    const writes = await Promise.all(entries.map(async (entry) => {
      const previous = await context.env.DB.prepare("SELECT weight FROM k9weights WHERE dog_id = ? AND workspace_id = ? AND (date < ? OR (date = ? AND created_at < ?)) ORDER BY date DESC, created_at DESC LIMIT 1")
        .bind(entry.dogId, session.workspace.id, date, date, now).first<{ weight: number }>()
      const difference = previous ? entry.weight - Number(previous.weight) : null
      return context.env.DB.prepare("INSERT INTO k9weights (id, date, dog_id, nickname, weight, difference, workspace_id, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), date, entry.dogId, entry.nickname, entry.weight, difference, session.workspace.id, session.user.id, now, now).run()
    }))
    if (writes.some((result) => !result.success)) return json({ error: "One or more weight records could not be saved" }, 500)
    return json({ success: true, count: entries.length }, 201)
  } catch { return json({ error: "Failed to save weight records" }, 500) }
}