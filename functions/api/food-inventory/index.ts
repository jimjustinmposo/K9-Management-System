import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))

const select = `SELECT i.id, i.date, i.item, i.brand, i.amount,
  COALESCE((SELECT SUM(f.grams) / 1000.0 FROM k9feeding f
    WHERE f.workspace_id = i.workspace_id AND LOWER(TRIM(f.food)) = LOWER(TRIM(i.item))), 0) AS used,
  i.amount - COALESCE((SELECT SUM(f.grams) / 1000.0 FROM k9feeding f
    WHERE f.workspace_id = i.workspace_id AND LOWER(TRIM(f.food)) = LOWER(TRIM(i.item))), 0) AS remaining,
  i.created_at, i.updated_at
  FROM k9_food_inventory i`

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session
  const params = new URL(context.request.url).searchParams
  const search = params.get("search")?.trim() ?? ""
  const hasPagination = params.has("limit")
  const limit = Math.max(1, Math.min(200, Math.floor(Number(params.get("limit")) || 10)))
  const offset = Math.max(0, Math.floor(Number(params.get("offset")) || 0))
  const where = ["i.workspace_id = ?"]
  const bindings: (string | number)[] = [session.workspace.id]
  if (search) {
    where.push("(i.item LIKE ? OR i.brand LIKE ?)")
    bindings.push(`%${search}%`, `%${search}%`)
  }
  try {
    const [rows, count] = await Promise.all([
      context.env.DB.prepare(`${select} WHERE ${where.join(" AND ")} ORDER BY i.date DESC, i.created_at DESC${hasPagination ? " LIMIT ? OFFSET ?" : ""}`)
        .bind(...bindings, ...(hasPagination ? [limit, offset] : [])).all(),
      hasPagination ? context.env.DB.prepare(`SELECT COUNT(*) AS total FROM k9_food_inventory i WHERE ${where.join(" AND ")}`).bind(...bindings).first<{ total: number }>() : Promise.resolve(null),
    ])
    return json({ data: rows.results ?? [], ...(hasPagination ? { total: Number(count?.total ?? 0) } : {}) })
  } catch { return json({ error: "Failed to load food inventory" }, 500) }
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "create")
  if (isResponse(session)) return session
  try {
    const body = await context.request.json() as Record<string, unknown>
    const date = clean(body.date), item = clean(body.item), brand = clean(body.brand)
    const amount = Number(body.amount)
    if (!validDate(date)) return json({ error: "Enter a valid stock date" }, 400)
    if (!item || item.length > 200) return json({ error: "Food item is required (maximum 200 characters)" }, 400)
    if (brand.length > 200) return json({ error: "Brand must be 200 characters or fewer" }, 400)
    if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) return json({ error: "Enter a valid amount in kg" }, 400)
    const id = crypto.randomUUID(), now = new Date().toISOString()
    await context.env.DB.prepare("INSERT INTO k9_food_inventory (id, date, item, brand, amount, workspace_id, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, date, item, brand, amount, session.workspace.id, session.user.id, now, now).run()
    const row = await context.env.DB.prepare(`${select} WHERE i.id = ? AND i.workspace_id = ?`).bind(id, session.workspace.id).first()
    return json({ data: row }, 201)
  } catch { return json({ error: "Failed to add food inventory" }, 500) }
}