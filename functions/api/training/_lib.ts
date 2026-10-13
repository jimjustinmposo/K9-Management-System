import { isResponse, requireSession, type AppEnv, type SessionInfo } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

export type Discipline = "obedience" | "detection" | "tracking" | "protection" | "socialization"
type Context = PagesFunctionContext<AppEnv>

const tables: Record<Discipline, string> = {
  obedience: "k9_training_obedience",
  detection: "k9_training_detection",
  tracking: "k9_training_tracking",
  protection: "k9_training_protection",
  socialization: "k9_training_socialization",
}
const datePattern = /^\d{4}-\d{2}-\d{2}$/

function discipline(context: Context): Discipline | null {
  const value = context.params.discipline as string
  return Object.hasOwn(tables, value) ? value as Discipline : null
}

function validate(body: Record<string, unknown>) {
  const values = {
    k9_id: clean(body.k9_id),
    handler_id: clean(body.handler_id),
    session_date: clean(body.session_date),
    note: clean(body.note),
  }
  if (!values.k9_id) return "K9 is required"
  if (!values.handler_id) return "Handler is required"
  if (!values.session_date || !datePattern.test(values.session_date) || Number.isNaN(Date.parse(`${values.session_date}T00:00:00Z`))) return "Enter a valid training date (YYYY-MM-DD)"
  if (values.note.length > 4000) return "Note must be 4000 characters or fewer"
  return values
}

async function linkedRecordsBelongToWorkspace(context: Context, session: SessionInfo, values: { k9_id: string; handler_id: string }) {
  const [k9, handler] = await Promise.all([
    context.env.DB.prepare("SELECT id FROM k9_roster WHERE id = ? AND workspace_id = ?").bind(values.k9_id, session.workspace.id).first(),
    context.env.DB.prepare("SELECT id FROM k9_handlers WHERE id = ? AND workspace_id = ?").bind(values.handler_id, session.workspace.id).first(),
  ])
  return Boolean(k9 && handler)
}

const select = (table: string) => `SELECT t.id, t.k9_id, t.handler_id, t.session_date, t.note, t.created_at, t.updated_at,
  k.dog_name, h.full_name AS handler_name FROM ${table} t
  JOIN k9_roster k ON k.id = t.k9_id AND k.workspace_id = t.workspace_id
  JOIN k9_handlers h ON h.id = t.handler_id AND h.workspace_id = t.workspace_id`

export async function list(context: Context) {
  const session = await requireSession(context, "view"); if (isResponse(session)) return session
  const kind = discipline(context); if (!kind) return json({ error: "Training discipline not found" }, 404)
  try {
    const params = new URL(context.request.url).searchParams
    const conditions = ["t.workspace_id = ?"]
    const bindings: string[] = [session.workspace.id]
    for (const key of ["k9_id", "handler_id"]) {
      const value = params.get(key)?.trim()
      if (value) { conditions.push(`t.${key} = ?`); bindings.push(value) }
    }
    const search = params.get("search")?.trim()
    if (search) { conditions.push("(k.dog_name LIKE ? OR h.full_name LIKE ? OR t.note LIKE ?)"); bindings.push(...Array(3).fill(`%${search}%`)) }
    const hasPagination = params.has("limit")
    const requestedLimit = Number(params.get("limit"))
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(200, Math.floor(requestedLimit))) : 50
    const requestedOffset = Number(params.get("offset") ?? 0)
    const offset = Number.isFinite(requestedOffset) ? Math.max(0, Math.floor(requestedOffset)) : 0
    const base = `${select(tables[kind])} WHERE ${conditions.join(" AND ")}`
    const [result, count] = await Promise.all([
      context.env.DB.prepare(`${base} ORDER BY t.session_date DESC, t.created_at DESC${hasPagination ? " LIMIT ? OFFSET ?" : ""}`)
        .bind(...bindings, ...(hasPagination ? [limit, offset] : [])).all(),
      hasPagination
        ? context.env.DB.prepare(`SELECT COUNT(*) AS total${base.slice(base.indexOf(" FROM "))}`).bind(...bindings).first<{ total: number }>()
        : Promise.resolve(null),
    ])
    return json({ data: result.results ?? [], ...(hasPagination ? { total: Number(count?.total ?? 0) } : {}) })
  } catch { return json({ error: "Failed to load training records" }, 500) }
}

export async function get(context: Context) {
  const session = await requireSession(context, "view"); if (isResponse(session)) return session
  const kind = discipline(context); if (!kind) return json({ error: "Training discipline not found" }, 404)
  try {
    const row = await context.env.DB.prepare(`${select(tables[kind])} WHERE t.id = ? AND t.workspace_id = ?`).bind(context.params.id as string, session.workspace.id).first()
    return row ? json({ data: row }) : json({ error: "Training record not found" }, 404)
  } catch { return json({ error: "Failed to load training record" }, 500) }
}

export async function create(context: Context) {
  const session = await requireSession(context, "create"); if (isResponse(session)) return session
  const kind = discipline(context); if (!kind) return json({ error: "Training discipline not found" }, 404)
  try {
    const values = validate(await context.request.json() as Record<string, unknown>)
    if (typeof values === "string") return json({ error: values }, 400)
    if (!await linkedRecordsBelongToWorkspace(context, session, values)) return json({ error: "Selected K9 or handler is not available in this workspace" }, 400)
    const now = new Date().toISOString(), id = crypto.randomUUID()
    await context.env.DB.prepare(`INSERT INTO ${tables[kind]} (id, k9_id, handler_id, session_date, note, workspace_id, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, values.k9_id, values.handler_id, values.session_date, values.note, session.workspace.id, session.user.id, now, now).run()
    const row = await context.env.DB.prepare(`${select(tables[kind])} WHERE t.id = ? AND t.workspace_id = ?`).bind(id, session.workspace.id).first()
    return json({ data: row }, 201)
  } catch { return json({ error: "Failed to create training record" }, 500) }
}

export async function update(context: Context) {
  const session = await requireSession(context, "edit"); if (isResponse(session)) return session
  const kind = discipline(context); if (!kind) return json({ error: "Training discipline not found" }, 404)
  try {
    const id = context.params.id as string, values = validate(await context.request.json() as Record<string, unknown>)
    if (typeof values === "string") return json({ error: values }, 400)
    if (!await linkedRecordsBelongToWorkspace(context, session, values)) return json({ error: "Selected K9 or handler is not available in this workspace" }, 400)
    const result = await context.env.DB.prepare(`UPDATE ${tables[kind]} SET k9_id = ?, handler_id = ?, session_date = ?, note = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`)
      .bind(values.k9_id, values.handler_id, values.session_date, values.note, new Date().toISOString(), id, session.workspace.id).run()
    if (!result.meta?.changes) return json({ error: "Training record not found" }, 404)
    const row = await context.env.DB.prepare(`${select(tables[kind])} WHERE t.id = ? AND t.workspace_id = ?`).bind(id, session.workspace.id).first()
    return json({ data: row })
  } catch { return json({ error: "Failed to update training record" }, 500) }
}

export async function remove(context: Context) {
  const session = await requireSession(context, "delete"); if (isResponse(session)) return session
  const kind = discipline(context); if (!kind) return json({ error: "Training discipline not found" }, 404)
  try {
    const result = await context.env.DB.prepare(`DELETE FROM ${tables[kind]} WHERE id = ? AND workspace_id = ?`).bind(context.params.id as string, session.workspace.id).run()
    return result.meta?.changes ? json({ success: true }) : json({ error: "Training record not found" }, 404)
  } catch { return json({ error: "Could not delete training record" }, 500) }
}