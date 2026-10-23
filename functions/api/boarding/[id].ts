import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const currencies = ["AED", "USD", "CAD", "EUR", "GBP", "AUD", "NZD"] as const

function calculateTotal(checkInDate: string, checkOutDate: string, pricePerDay: number): number | null {
  if (!checkOutDate) return null
  const days = Math.ceil((Date.parse(`${checkOutDate}T00:00:00Z`) - Date.parse(`${checkInDate}T00:00:00Z`)) / 86400000) + 1
  return Math.round(days * pricePerDay * 100) / 100
}

const selectRecord = `SELECT b.*, k.dog_name, k.nick_name, k.breed, k.profile_photo
  FROM boarding_records b
  JOIN k9_roster k ON k.id = b.k9_id AND k.workspace_id = b.workspace_id`

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session
  try {
    const row = await context.env.DB.prepare(`${selectRecord} WHERE b.id = ? AND b.workspace_id = ?`)
      .bind(context.params.id as string, session.workspace.id).first()
    return row ? json({ data: row }) : json({ error: "Boarding record not found" }, 404)
  } catch {
    return json({ error: "Failed to load boarding record" }, 500)
  }
}

export const onRequestPatch: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "create")
  if (isResponse(session)) return session
  try {
    const body = await context.request.json() as Record<string, unknown>
    if (!body || Object.keys(body).some((key) => !["status", "check_out_date"].includes(key))) return json({ error: "Only boarding status and checkout date can be changed" }, 400)
    const status = clean(body.status)
    if (!["Boarding", "Checked Out"].includes(status)) return json({ error: "Invalid boarding status" }, 400)
    const id = context.params.id as string
    const existing = await context.env.DB.prepare("SELECT check_in_date, price_per_day FROM boarding_records WHERE id = ? AND workspace_id = ?")
      .bind(id, session.workspace.id).first<{ check_in_date: string; price_per_day: number }>()
    if (!existing) return json({ error: "Boarding record not found" }, 404)
    const date = status === "Checked Out" ? clean(body.check_out_date) : ""
    if (status === "Checked Out" && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date || date < existing.check_in_date)) return json({ error: "Enter a valid checkout date on or after check-in" }, 400)
    await context.env.DB.prepare("UPDATE boarding_records SET status = ?, check_out_date = ?, total_amount = ?, updated_at = ? WHERE id = ? AND workspace_id = ?")
      .bind(status, date, status === "Checked Out" ? calculateTotal(existing.check_in_date, date, existing.price_per_day) : null, new Date().toISOString(), id, session.workspace.id).run()
    const row = await context.env.DB.prepare(`${selectRecord} WHERE b.id = ? AND b.workspace_id = ?`).bind(id, session.workspace.id).first()
    return json({ data: row })
  } catch { return json({ error: "Could not update boarding status" }, 500) }
}

export const onRequestPut: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "edit")
  if (isResponse(session)) return session
  try {
    const id = context.params.id as string
    const body = (await context.request.json()) as Record<string, unknown>
    const k9Id = clean(body.k9_id)
    const ownerName = clean(body.owner_name)
    const checkInDate = clean(body.check_in_date)
    const checkOutDate = clean(body.check_out_date)
    const status = clean(body.status)
    const currency = clean(body.currency) || "USD"
    const pricePerDay = Number(body.price_per_day)
    if (!k9Id || !ownerName) return json({ error: "Select a registered K9 and enter the owner name" }, 400)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkInDate)) return json({ error: "A valid check-in date is required" }, 400)
    if (checkOutDate && (!/^\d{4}-\d{2}-\d{2}$/.test(checkOutDate) || checkOutDate < checkInDate)) {
      return json({ error: "Check-out date must be on or after check-in" }, 400)
    }
    if (!["Boarding", "Checked Out"].includes(status)) return json({ error: "Invalid boarding status" }, 400)
    if (!currencies.includes(currency as (typeof currencies)[number])) return json({ error: "Select a supported currency" }, 400)
    if (!Number.isFinite(pricePerDay) || pricePerDay < 0) return json({ error: "Enter a valid daily price" }, 400)
    const totalAmount = status === "Checked Out" ? calculateTotal(checkInDate, checkOutDate, pricePerDay) : null
    const [existing, k9] = await Promise.all([
      context.env.DB.prepare("SELECT id FROM boarding_records WHERE id = ? AND workspace_id = ?").bind(id, session.workspace.id).first(),
      context.env.DB.prepare("SELECT id FROM k9_roster WHERE id = ? AND workspace_id = ?").bind(k9Id, session.workspace.id).first(),
    ])
    if (!existing) return json({ error: "Boarding record not found" }, 404)
    if (!k9) return json({ error: "Register this dog in the K9 Roster first" }, 400)
    await context.env.DB.prepare(`UPDATE boarding_records SET k9_id = ?, owner_name = ?, owner_phone = ?,
      check_in_date = ?, check_out_date = ?, status = ?, notes = ?, updated_at = ?, currency = ?, price_per_day = ?, total_amount = ?
      WHERE id = ? AND workspace_id = ?`)
      .bind(k9Id, ownerName, clean(body.owner_phone), checkInDate, checkOutDate, status,
        typeof body.notes === "string" ? body.notes.trim() : "", new Date().toISOString(), currency, pricePerDay, totalAmount, id, session.workspace.id)
      .run()
    const row = await context.env.DB.prepare(`${selectRecord} WHERE b.id = ? AND b.workspace_id = ?`)
      .bind(id, session.workspace.id).first()
    return json({ data: row })
  } catch {
    return json({ error: "Failed to update boarding record" }, 500)
  }
}

export const onRequestDelete: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "delete")
  if (isResponse(session)) return session
  try {
    await context.env.DB.prepare("DELETE FROM boarding_records WHERE id = ? AND workspace_id = ?")
      .bind(context.params.id as string, session.workspace.id).run()
    return json({ success: true })
  } catch {
    return json({ error: "Failed to delete boarding record" }, 500)
  }
}