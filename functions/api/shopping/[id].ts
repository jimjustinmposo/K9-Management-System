import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
const select = "SELECT s.id, s.date, s.type, s.item, s.description, s.quantity, s.price, s.food_inventory_id, s.created_by_user_id, s.created_at, s.updated_at FROM k9_shopping s"

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view"); if (isResponse(session)) return session
  try {
    const row = await context.env.DB.prepare(`${select} WHERE s.id = ? AND s.workspace_id = ?`).bind(context.params.id as string, session.workspace.id).first()
    return row ? json({ data: row }) : json({ error: "Shopping record not found" }, 404)
  } catch { return json({ error: "Failed to load shopping record" }, 500) }
}

export const onRequestPut: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "edit"); if (isResponse(session)) return session
  try {
    const id = context.params.id as string, body = await context.request.json() as Record<string, unknown>
    const previous = await context.env.DB.prepare("SELECT id, type, quantity, food_inventory_id FROM k9_shopping WHERE id = ? AND workspace_id = ?").bind(id, session.workspace.id).first<{ id: string; type: string; quantity: number; food_inventory_id: string | null }>()
    if (!previous) return json({ error: "Shopping record not found" }, 404)
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
      if (inventory) inventoryId = inventory.id
      else {
        inventoryId = crypto.randomUUID()
        await context.env.DB.prepare("INSERT INTO k9_food_inventory (id, date, item, brand, amount, workspace_id, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)")
          .bind(inventoryId, date, item, brand, session.workspace.id, session.user.id, new Date().toISOString(), new Date().toISOString()).run()
      }
    }
    const now = new Date().toISOString()
    const operations: D1PreparedStatement[] = []
    const oldInventoryId = previous.type === "food" ? previous.food_inventory_id : null
    if (oldInventoryId && oldInventoryId === inventoryId) {
      const delta = quantity - Number(previous.quantity)
      if (delta !== 0) operations.push(context.env.DB.prepare("UPDATE k9_food_inventory SET amount = amount + ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(delta, now, oldInventoryId, session.workspace.id))
    } else {
      if (oldInventoryId) operations.push(context.env.DB.prepare("UPDATE k9_food_inventory SET amount = amount - ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(Number(previous.quantity), now, oldInventoryId, session.workspace.id))
      if (inventoryId) operations.push(context.env.DB.prepare("UPDATE k9_food_inventory SET amount = amount + ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(quantity, now, inventoryId, session.workspace.id))
    }
    const guardInventoryWrite = (oldInventoryId !== inventoryId && (oldInventoryId !== null || inventoryId !== null)) || (oldInventoryId === inventoryId && oldInventoryId !== null && quantity !== Number(previous.quantity))
    const update = context.env.DB.prepare(`UPDATE k9_shopping SET date = ?, type = ?, item = ?, description = ?, quantity = ?, price = ?, food_inventory_id = ?, updated_at = ? WHERE id = ? AND workspace_id = ?${guardInventoryWrite ? " AND changes() > 0" : ""}`)
      .bind(date, type, item, description, quantity, price, inventoryId, now, id, session.workspace.id)
    operations.push(update)
    const results = await context.env.DB.batch(operations)
    if (results.some((result) => !result.meta?.changes)) return json({ error: "Could not update the shopping record and its inventory stock" }, 409)
    return json({ data: await context.env.DB.prepare(`${select} WHERE s.id = ? AND s.workspace_id = ?`).bind(id, session.workspace.id).first() })
  } catch { return json({ error: "Failed to update shopping record" }, 500) }
}

export const onRequestDelete: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "delete"); if (isResponse(session)) return session
  try {
    const id = context.params.id as string
    const record = await context.env.DB.prepare("SELECT type, quantity, food_inventory_id FROM k9_shopping WHERE id = ? AND workspace_id = ?").bind(id, session.workspace.id).first<{ type: string; quantity: number; food_inventory_id: string | null }>()
    if (!record) return json({ error: "Shopping record not found" }, 404)
    const inventoryId = record.type === "food" ? record.food_inventory_id : null
    const now = new Date().toISOString()
    const statements: D1PreparedStatement[] = []
    if (inventoryId) statements.push(context.env.DB.prepare("UPDATE k9_food_inventory SET amount = amount - ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(Number(record.quantity), now, inventoryId, session.workspace.id))
    statements.push(context.env.DB.prepare("DELETE FROM k9_shopping WHERE id = ? AND workspace_id = ?").bind(id, session.workspace.id))
    const results = await context.env.DB.batch(statements)
    if (results.some((result) => !result.meta?.changes)) return json({ error: "Cannot delete this record because its inventory stock has already been consumed" }, 409)
    return json({ success: true })
  } catch { return json({ error: "Failed to delete shopping record" }, 500) }
}