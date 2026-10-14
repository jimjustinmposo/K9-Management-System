import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session
  const params = new URL(context.request.url).searchParams
  const search = params.get("search")?.trim() ?? ""
  const hasPagination = params.has("limit")
  const limit = Math.max(1, Math.min(200, Math.floor(Number(params.get("limit")) || 10)))
  const offset = Math.max(0, Math.floor(Number(params.get("offset")) || 0))
  const where = ["f.workspace_id = ?"]
  const bindings: (string | number)[] = [session.workspace.id]
  if (search) {
    where.push("(k.dog_name LIKE ? OR h.full_name LIKE ? OR f.food LIKE ? OR f.noted LIKE ?)")
    bindings.push(...Array(4).fill(`%${search}%`))
  }
  const base = `FROM k9feeding f JOIN k9_roster k ON k.id = f.dog AND k.workspace_id = f.workspace_id JOIN k9_handlers h ON h.id = f.handler AND h.workspace_id = f.workspace_id WHERE ${where.join(" AND ")}`
  try {
    const [result, count] = await Promise.all([
      context.env.DB.prepare(`SELECT f.id, f.date, f.dog, f.handler, f.food, f.grams, f.noted, f.created_at, f.updated_at, k.dog_name, h.full_name AS handler_name ${base} ORDER BY f.date DESC, f.created_at DESC${hasPagination ? " LIMIT ? OFFSET ?" : ""}`).bind(...bindings, ...(hasPagination ? [limit, offset] : [])).all(),
      hasPagination ? context.env.DB.prepare(`SELECT COUNT(*) AS total ${base}`).bind(...bindings).first<{ total: number }>() : Promise.resolve(null),
    ])
    return json({ data: result.results ?? [], ...(hasPagination ? { total: Number(count?.total ?? 0) } : {}) })
  } catch { return json({ error: "Failed to load feeding records" }, 500) }
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "create")
  if (isResponse(session)) return session
  try {
    const body = await context.request.json() as Record<string, unknown>
    const date = clean(body.date), dog = clean(body.dog), handler = clean(body.handler), food = clean(body.food), noted = clean(body.noted)
    const grams = Number(body.grams)
    if (!validDate(date)) return json({ error: "Enter a valid feeding date" }, 400)
    if (!dog || !handler) return json({ error: "Select a dog and handler" }, 400)
    if (!food || food.length > 200) return json({ error: "Food is required (maximum 200 characters)" }, 400)
    if (!Number.isFinite(grams) || grams < 0 || grams > 100000) return json({ error: "Enter a valid amount in grams" }, 400)
    if (noted.length > 4000) return json({ error: "Notes must be 4000 characters or fewer" }, 400)
    const linked = await Promise.all([
      context.env.DB.prepare("SELECT id FROM k9_roster WHERE id = ? AND workspace_id = ?").bind(dog, session.workspace.id).first(),
      context.env.DB.prepare("SELECT id FROM k9_handlers WHERE id = ? AND workspace_id = ?").bind(handler, session.workspace.id).first(),
    ])
    if (!linked[0] || !linked[1]) return json({ error: "Selected dog or handler is not available in this workspace" }, 400)
    const stock = await context.env.DB.prepare(`SELECT COUNT(*) AS entries, COALESCE(SUM(i.amount), 0) - COALESCE((SELECT SUM(f.grams) / 1000.0 FROM k9feeding f WHERE f.workspace_id = i.workspace_id AND LOWER(TRIM(f.food)) = LOWER(TRIM(i.item))), 0) AS available FROM k9_food_inventory i WHERE i.workspace_id = ? AND LOWER(TRIM(i.item)) = LOWER(TRIM(?))`).bind(session.workspace.id, food).first<{ entries: number; available: number }>()
    if (!stock?.entries) return json({ error: `Food “${food}” is not in the food inventory. Add it to Food Inventory before recording a feeding.` }, 400)
    const availableGrams = Number(stock.available) * 1000
    if (grams > availableGrams) return json({ error: `Insufficient inventory for “${food}”: only ${Math.max(0, Number(stock.available)).toFixed(3)} kg (${Math.max(0, availableGrams).toLocaleString()} g) remains. Please add stock or reduce the portion to ${Math.max(0, availableGrams).toLocaleString()} g or less.` }, 400)
    const id = crypto.randomUUID(), now = new Date().toISOString()
    await context.env.DB.prepare("INSERT INTO k9feeding (id, date, dog, handler, food, grams, noted, workspace_id, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, date, dog, handler, food, grams, noted, session.workspace.id, session.user.id, now, now).run()
    const row = await context.env.DB.prepare("SELECT f.id, f.date, f.dog, f.handler, f.food, f.grams, f.noted, f.created_at, f.updated_at, k.dog_name, h.full_name AS handler_name FROM k9feeding f JOIN k9_roster k ON k.id = f.dog AND k.workspace_id = f.workspace_id JOIN k9_handlers h ON h.id = f.handler AND h.workspace_id = f.workspace_id WHERE f.id = ? AND f.workspace_id = ?").bind(id, session.workspace.id).first()
    return json({ data: row }, 201)
  } catch { return json({ error: "Failed to create feeding record" }, 500) }
}