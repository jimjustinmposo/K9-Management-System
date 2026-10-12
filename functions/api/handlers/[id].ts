import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

const selected = "SELECT id, full_name, nick_name, position, email, phone, created_at, updated_at FROM k9_handlers"

function validate(body: Record<string, unknown>) {
  const values = {
    full_name: clean(body.full_name), nick_name: clean(body.nick_name), position: clean(body.position),
    email: clean(body.email).toLowerCase(), phone: clean(body.phone),
  }
  if (!values.full_name) return "Full name is required"
  if (!values.position) return "Position is required"
  if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return "Enter a valid email address"
  if (!values.phone) return "Phone number is required"
  if (Object.values(values).some((value) => value.length > 160)) return "Handler fields must be 160 characters or fewer"
  return values
}

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session
  try {
    const row = await context.env.DB.prepare(`${selected} WHERE id = ? AND workspace_id = ?`)
      .bind(context.params.id as string, session.workspace.id).first()
    return row ? json({ data: row }) : json({ error: "Handler not found" }, 404)
  } catch {
    return json({ error: "Failed to load handler" }, 500)
  }
}

export const onRequestPut: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "edit")
  if (isResponse(session)) return session
  try {
    const id = context.params.id as string
    const values = validate(await context.request.json() as Record<string, unknown>)
    if (typeof values === "string") return json({ error: values }, 400)
    const existing = await context.env.DB.prepare("SELECT id FROM k9_handlers WHERE id = ? AND workspace_id = ?")
      .bind(id, session.workspace.id).first()
    if (!existing) return json({ error: "Handler not found" }, 404)
    await context.env.DB.prepare(`UPDATE k9_handlers SET full_name = ?, nick_name = ?, position = ?, email = ?, phone = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?`)
      .bind(values.full_name, values.nick_name, values.position, values.email, values.phone, new Date().toISOString(), id, session.workspace.id).run()
    const row = await context.env.DB.prepare(`${selected} WHERE id = ? AND workspace_id = ?`).bind(id, session.workspace.id).first()
    return json({ data: row })
  } catch {
    return json({ error: "Failed to update handler" }, 500)
  }
}

export const onRequestDelete: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "delete")
  if (isResponse(session)) return session
  try {
    const result = await context.env.DB.prepare("DELETE FROM k9_handlers WHERE id = ? AND workspace_id = ?")
      .bind(context.params.id as string, session.workspace.id).run()
    return result.meta?.changes === 0 ? json({ error: "Handler not found" }, 404) : json({ success: true })
  } catch {
    return json({ error: "Failed to delete handler" }, 500)
  }
}