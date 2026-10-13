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
  const hasPagination = params.has("limit")
  const requestedLimit = Number(params.get("limit"))
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(20, Math.floor(requestedLimit))) : 10
  const requestedOffset = Number(params.get("offset") ?? 0)
  const offset = Number.isFinite(requestedOffset) ? Math.max(0, Math.floor(requestedOffset)) : 0
  try {
    const base = `SELECT id, full_name, nick_name, position, email, phone, created_at, updated_at
      FROM k9_handlers WHERE workspace_id = ?${search ? " AND (full_name LIKE ? OR nick_name LIKE ? OR position LIKE ? OR email LIKE ? OR phone LIKE ?)" : ""}
      ORDER BY full_name COLLATE NOCASE ASC`
    const bindings = search ? [session.workspace.id, ...Array(5).fill(`%${search}%`)] : [session.workspace.id]
    const [result, count] = await Promise.all([
      context.env.DB.prepare(`${base}${hasPagination ? " LIMIT ? OFFSET ?" : ""}`).bind(...bindings, ...(hasPagination ? [limit, offset] : [])).all(),
      hasPagination ? context.env.DB.prepare(`SELECT COUNT(*) AS total FROM k9_handlers WHERE workspace_id = ?${search ? " AND (full_name LIKE ? OR nick_name LIKE ? OR position LIKE ? OR email LIKE ? OR phone LIKE ?)" : ""}`).bind(...bindings).first<{ total: number }>() : Promise.resolve(null),
    ])
    return json({ data: result.results ?? [], ...(hasPagination ? { total: Number(count?.total ?? 0) } : {}) })
  } catch {
    return json({ error: "Failed to load handlers" }, 500)
  }
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageMembers")
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