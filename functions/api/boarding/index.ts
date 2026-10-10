import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const statuses = ["Boarding", "Checked Out"] as const

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `boarding-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
}

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session

  const params = new URL(context.request.url).searchParams
  const search = params.get("search")?.trim() ?? ""
  const status = params.get("status")?.trim() ?? ""
  const k9Id = params.get("k9_id")?.trim() ?? ""

  try {
    let query = `SELECT b.*, k.dog_name, k.nick_name, k.breed, k.profile_photo
      FROM boarding_records b
      JOIN k9_roster k ON k.id = b.k9_id AND k.workspace_id = b.workspace_id
      WHERE b.workspace_id = ?`
    const values: string[] = [session.workspace.id]

    if (status && statuses.includes(status as (typeof statuses)[number])) {
      query += " AND b.status = ?"
      values.push(status)
    }
    if (k9Id) {
      query += " AND b.k9_id = ?"
      values.push(k9Id)
    }
    if (search) {
      query += " AND (k.dog_name LIKE ? OR k.nick_name LIKE ? OR b.owner_name LIKE ? OR b.owner_phone LIKE ?)"
      const like = `%${search}%`
      values.push(like, like, like, like)
    }

    const result = await context.env.DB.prepare(`${query} ORDER BY b.check_in_date DESC, b.created_at DESC`)
      .bind(...values)
      .all()
    return json({ data: result.results ?? [] })
  } catch {
    return json({ error: "Failed to load boarding records" }, 500)
  }
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "create")
  if (isResponse(session)) return session

  try {
    const body = (await context.request.json()) as Record<string, unknown>
    const k9Id = clean(body.k9_id)
    const ownerName = clean(body.owner_name)
    const checkInDate = clean(body.check_in_date)
    const status = clean(body.status) || "Boarding"
    if (!k9Id) return json({ error: "Select a registered K9" }, 400)
    if (!ownerName) return json({ error: "Owner name is required" }, 400)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkInDate)) return json({ error: "A valid check-in date is required" }, 400)
    if (!statuses.includes(status as (typeof statuses)[number])) return json({ error: "Invalid boarding status" }, 400)
    const checkOutDate = clean(body.check_out_date)
    if (checkOutDate && (!/^\d{4}-\d{2}-\d{2}$/.test(checkOutDate) || checkOutDate < checkInDate)) {
      return json({ error: "Check-out date must be on or after check-in" }, 400)
    }

    const k9 = await context.env.DB.prepare("SELECT id FROM k9_roster WHERE id = ? AND workspace_id = ?")
      .bind(k9Id, session.workspace.id)
      .first()
    if (!k9) return json({ error: "Register this dog in the K9 Roster first" }, 400)

    const now = new Date().toISOString()
    const id = newId()
    await context.env.DB.prepare(`INSERT INTO boarding_records
      (id, k9_id, owner_name, owner_phone, check_in_date, check_out_date, status, notes, created_at, updated_at, workspace_id, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, k9Id, ownerName, clean(body.owner_phone), checkInDate, checkOutDate, status,
        typeof body.notes === "string" ? body.notes.trim() : "", now, now, session.workspace.id, session.user.id)
      .run()

    const row = await context.env.DB.prepare(`SELECT b.*, k.dog_name, k.nick_name, k.breed, k.profile_photo
      FROM boarding_records b JOIN k9_roster k ON k.id = b.k9_id AND k.workspace_id = b.workspace_id
      WHERE b.id = ? AND b.workspace_id = ?`).bind(id, session.workspace.id).first()
    return json({ data: row }, 201)
  } catch {
    return json({ error: "Failed to create boarding record" }, 500)
  }
}