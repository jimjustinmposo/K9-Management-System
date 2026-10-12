import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

function validate(body: Record<string, unknown>) {
  const values = {
    full_name: clean(body.full_name),
    nick_name: clean(body.nick_name),
    position: clean(body.position),
    email: clean(body.email).toLowerCase(),
    phone: clean(body.phone),
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
  const params = new URL(context.request.url).searchParams
  const search = params.get("search")?.trim() ?? ""
  try {
    const statement = context.env.DB.prepare(`SELECT id, full_name, nick_name, position, email, phone, created_at, updated_at
      FROM k9_handlers WHERE workspace_id = ?${search ? " AND (full_name LIKE ? OR nick_name LIKE ? OR position LIKE ? OR email LIKE ? OR phone LIKE ?)" : ""}
      ORDER BY full_name COLLATE NOCASE ASC`)
    const result = await (search
      ? statement.bind(session.workspace.id, ...Array(5).fill(`%${search}%`))
      : statement.bind(session.workspace.id)).all()
    return json({ data: result.results ?? [] })
  } catch {
    return json({ error: "Failed to load handlers" }, 500)
  }
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "create")
  if (isResponse(session)) return session
  try {
    const values = validate(await context.request.json() as Record<string, unknown>)
    if (typeof values === "string") return json({ error: values }, 400)
    const now = new Date().toISOString(), id = crypto.randomUUID()
    await context.env.DB.prepare(`INSERT INTO k9_handlers
      (id, full_name, nick_name, position, email, phone, workspace_id, created_by_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, values.full_name, values.nick_name, values.position, values.email, values.phone,
        session.workspace.id, session.user.id, now, now).run()
    const row = await context.env.DB.prepare(`SELECT id, full_name, nick_name, position, email, phone, created_at, updated_at
      FROM k9_handlers WHERE id = ? AND workspace_id = ?`).bind(id, session.workspace.id).first()
    return json({ data: row }, 201)
  } catch {
    return json({ error: "Failed to create handler" }, 500)
  }
}