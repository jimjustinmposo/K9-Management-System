import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
const select = "SELECT s.id, s.date, s.type, s.item, s.description, s.quantity, s.price, s.food_inventory_id, s.created_by_user_id, s.created_at, s.updated_at FROM k9_shopping s"

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session
  const params = new URL(context.request.url).searchParams
  const search = params.get("search")?.trim() ?? ""
  const type = params.get("type")?.trim() ?? ""
  const hasPagination = params.has("limit")
  const limit = Math.max(1, Math.min(200, Math.floor(Number(params.get("limit")) || 10)))
  const offset = Math.max(0, Math.floor(Number(params.get("offset")) || 0))
  const where = ["s.workspace_id = ?"]
  const bindings: (string | number)[] = [session.workspace.id]
  if (type === "food" || type === "others") { where.push("s.type = ?"); bindings.push(type) }
  if (search) { where.push("(s.item LIKE ? OR s.description LIKE ?)"); bindings.push(`%${search}%`, `%${search}%`) }
  const from = `FROM k9_shopping s WHERE ${where.join(" AND ")}`
  try {
    const [rows, count] = await Promise.all([
      context.env.DB.prepare(`${select} WHERE ${where.join(" AND ")} ORDER BY s.date DESC, s.created_at DESC${hasPagination ? " LIMIT ? OFFSET ?" : ""}`).bind(...bindings, ...(hasPagination ? [limit, offset] : [])).all(),
      hasPagination ? context.env.DB.prepare(`SELECT COUNT(*) AS total ${from}`).bind(...bindings).first<{ total: number }>() : Promise.resolve(null),
    ])
    return json({ data: rows.results ?? [], ...(hasPagination ? { total: Number(count?.total ?? 0) } : {}) })
  } catch { return json({ error: "Failed to load shopping records" }, 500) }
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "create")
  if (isResponse(session)) return session
  try {
    const body = await context.request.json() as Record<string, unknown>
    const date = clean(body.date), type = clean(body.type), item = clean(body.item), description = clean(body.description), brand = clean(body.brand)
    const quantity = Number(body.quantity), price = Number(body.price)
    if (!validDate(date)) return json({ error: "Enter a valid shopping date" }, 400)
    if (type !== "food" && type !== "others") return json({ error: "Choose food or others" }, 400)
    if (!item || item.length > 200) return json({ error: "Item is required (maximum 200 characters)" }, 400)
    if (description.length > 4000) return json({ error: "Description must be 4000 characters or fewer" }, 400)
    if (brand.length > 200) return json({ error: "Brand must be 200 characters or fewer" }, 400)
    if (!Number.isFinite(quantity) || quantity < 0 || quantity > 1000000) return json({ error: "Enter a valid quantity" }, 400)
    if (!Number.isFinite(price) || price < 0 || price > 100000000) return json({ error: "Enter a valid price" }, 400)
    let inventoryId: string | null = null
    if (type === "food") {
      const inventory = await context.env.DB.prepare("SELECT id FROM k9_food_inventory WHERE workspace_id = ? AND LOWER(TRIM(item)) = LOWER(TRIM(?)) ORDER BY date DESC, created_at DESC LIMIT 1").bind(session.workspace.id, item).first<{ id: string }>()
      inventoryId = inventory?.id ?? crypto.randomUUID()
    }
    const id = crypto.randomUUID(), now = new Date().toISOString()
    const insert = context.env.DB.prepare("INSERT INTO k9_shopping (id, date, type, item, description, quantity, price, food_inventory_id, workspace_id, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, date, type, item, description, quantity, price, inventoryId, session.workspace.id, session.user.id, now, now)
    if (type === "food" && inventoryId) {
      const inventory = await context.env.DB.prepare("SELECT id FROM k9_food_inventory WHERE id = ? AND workspace_id = ?").bind(inventoryId, session.workspace.id).first()
      if (!inventory) {
        const results = await context.env.DB.batch([
          context.env.DB.prepare("INSERT INTO k9_food_inventory (id, date, item, brand, amount, workspace_id, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(inventoryId, date, item, brand, quantity, session.workspace.id, session.user.id, now, now),
          context.env.DB.prepare("INSERT INTO k9_shopping (id, date, type, item, description, quantity, price, food_inventory_id, workspace_id, created_by_user_id, created_at, updated_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() > 0")
            .bind(id, date, type, item, description, quantity, price, inventoryId, session.workspace.id, session.user.id, now, now),
        ])
        if (!results[0]?.meta?.changes || !results[1]?.meta?.changes) return json({ error: "Could not create the food inventory and shopping records" }, 409)
        const row = await context.env.DB.prepare(`${select} WHERE s.id = ? AND s.workspace_id = ?`).bind(id, session.workspace.id).first()
        return json({ data: row }, 201)
      }
      const results = await context.env.DB.batch([
        context.env.DB.prepare("UPDATE k9_food_inventory SET amount = amount + ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(quantity, now, inventoryId, session.workspace.id),
        context.env.DB.prepare("INSERT INTO k9_shopping (id, date, type, item, description, quantity, price, food_inventory_id, workspace_id, created_by_user_id, created_at, updated_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() > 0")
          .bind(id, date, type, item, description, quantity, price, inventoryId, session.workspace.id, session.user.id, now, now),
      ])
      if (!results[0]?.meta?.changes || !results[1]?.meta?.changes) return json({ error: "Could not add the food purchase to inventory" }, 409)
    } else {
      await insert.run()
    }
    const row = await context.env.DB.prepare(`${select} WHERE s.id = ? AND s.workspace_id = ?`).bind(id, session.workspace.id).first()
    return json({ data: row }, 201)
  } catch { return json({ error: "Failed to create shopping record" }, 500) }
}