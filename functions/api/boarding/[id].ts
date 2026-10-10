import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

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
    if (!k9Id || !ownerName) return json({ error: "Select a registered K9 and enter the owner name" }, 400)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkInDate)) return json({ error: "A valid check-in date is required" }, 400)
    if (checkOutDate && (!/^\d{4}-\d{2}-\d{2}$/.test(checkOutDate) || checkOutDate < checkInDate)) {
      return json({ error: "Check-out date must be on or after check-in" }, 400)
    }
    if (!["Boarding", "Checked Out"].includes(status)) return json({ error: "Invalid boarding status" }, 400)
    const [existing, k9] = await Promise.all([
      context.env.DB.prepare("SELECT id FROM boarding_records WHERE id = ? AND workspace_id = ?").bind(id, session.workspace.id).first(),
      context.env.DB.prepare("SELECT id FROM k9_roster WHERE id = ? AND workspace_id = ?").bind(k9Id, session.workspace.id).first(),
    ])
    if (!existing) return json({ error: "Boarding record not found" }, 404)
    if (!k9) return json({ error: "Register this dog in the K9 Roster first" }, 400)
    await context.env.DB.prepare(`UPDATE boarding_records SET k9_id = ?, owner_name = ?, owner_phone = ?,
      check_in_date = ?, check_out_date = ?, status = ?, notes = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?`)
      .bind(k9Id, ownerName, clean(body.owner_phone), checkInDate, checkOutDate, status,
        typeof body.notes === "string" ? body.notes.trim() : "", new Date().toISOString(), id, session.workspace.id)
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