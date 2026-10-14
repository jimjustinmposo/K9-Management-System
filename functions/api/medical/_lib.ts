import { isResponse, requireSession, type AppEnv, type SessionInfo } from "../../_lib/auth"
import { clean, json } from "../../_lib/http"

export type Resource = "medications" | "records" | "conditions"
type Context = PagesFunctionContext<AppEnv>
type Fields = Record<string, string>

const tables: Record<Resource, { table: string; order: string; required: string[] }> = {
  medications: { table: "k9_medications", order: "name ASC", required: ["name"] },
  records: { table: "k9_medical_records", order: "start_date DESC, created_at DESC", required: ["k9_id", "medication_id", "dosage_given", "administration_method", "frequency", "start_date"] },
  conditions: { table: "k9_medical_conditions", order: "diagnosis_date DESC, created_at DESC", required: ["k9_id", "condition_name", "diagnosis_date", "severity"] },
}
const fields: Record<Resource, Fields> = {
  medications: { name: "name", category: "category", description: "description", dosage_guideline: "dosage_guideline" },
  records: { k9_id: "k9_id", medication_id: "medication_id", dosage_given: "dosage_given", administration_method: "administration_method", frequency: "frequency", start_date: "start_date", end_date: "end_date", administered_by: "administered_by", notes: "notes" },
  conditions: { k9_id: "k9_id", condition_name: "condition_name", diagnosis_date: "diagnosis_date", severity: "severity", notes: "notes" },
}
const enums: Record<string, string[]> = {
  category: ["Antibiotic", "Pain Relief", "Vaccine", "Dewormer", "Supplement", "Preventive", "Other"],
  administration_method: ["Oral", "Injection", "Topical", "Ophthalmic", "Otic", "Other"],
  frequency: ["Single dose", "Once daily", "Twice daily", "Every 8 hours", "Every 12 hours", "Weekly", "As needed"],
  severity: ["Low", "Moderate", "High", "Critical"],
}
const dateFields = ["start_date", "end_date", "diagnosis_date"]
const datePattern = /^\d{4}-\d{2}-\d{2}$/

function readBody(body: Record<string, unknown>, resource: Resource): Record<string, string> | string {
  const values = Object.fromEntries(Object.keys(fields[resource]).map((key) => [key, clean(body[key])]))
  for (const required of tables[resource].required) if (!values[required]) return `${required.replaceAll("_", " ")} is required`
  for (const [key, allowed] of Object.entries(enums)) if (key in values && values[key] && !allowed.includes(values[key])) return `Invalid ${key.replaceAll("_", " ")}`
  for (const key of dateFields) if (key in values && values[key] && !datePattern.test(values[key])) return `Enter a valid ${key.replaceAll("_", " ")} (YYYY-MM-DD)`
  if (resource === "records" && values.end_date && values.end_date < values.start_date) return "End date must be on or after start date"
  if (resource === "medications" && !values.category) values.category = "Other"
  return values
}

async function belongsToWorkspace(context: Context, session: SessionInfo, resource: Resource, values: Record<string, string>) {
  if (resource !== "records" && resource !== "conditions") return true
  const k9 = await context.env.DB.prepare("SELECT id FROM k9_roster WHERE id = ? AND workspace_id = ?").bind(values.k9_id, session.workspace.id).first()
  if (!k9) return false
  if (resource === "records") {
    const medication = await context.env.DB.prepare("SELECT id FROM k9_medications WHERE id = ? AND workspace_id = ?").bind(values.medication_id, session.workspace.id).first()
    return Boolean(medication)
  }
  return true
}

function selectSql(resource: Resource) {
  if (resource === "records") return `SELECT r.*, k.dog_name, k.nick_name, k.breed, m.name AS medication_name, m.category AS medication_category FROM k9_medical_records r JOIN k9_roster k ON k.id=r.k9_id AND k.workspace_id=r.workspace_id JOIN k9_medications m ON m.id=r.medication_id AND m.workspace_id=r.workspace_id`
  if (resource === "conditions") return `SELECT c.*, k.dog_name, k.nick_name, k.breed FROM k9_medical_conditions c JOIN k9_roster k ON k.id=c.k9_id AND k.workspace_id=c.workspace_id`
  return "SELECT * FROM k9_medications"
}
function alias(resource: Resource) { return resource === "records" ? "r" : resource === "conditions" ? "c" : "k9_medications" }

export async function list(context: Context, resource: Resource) {
  const session = await requireSession(context, "view"); if (isResponse(session)) return session
  try {
    const config = tables[resource], params = new URL(context.request.url).searchParams
    const conditions = [`${alias(resource)}.workspace_id = ?`], bindings: string[] = [session.workspace.id]
    for (const key of resource === "records" ? ["k9_id", "medication_id", "frequency"] : resource === "conditions" ? ["k9_id", "severity"] : ["category"]) {
      const value = params.get(key)?.trim(); if (value) { conditions.push(`${alias(resource)}.${key} = ?`); bindings.push(value) }
    }
    const search = params.get("search")?.trim()
    if (search) {
      const columns = resource === "medications" ? ["name", "category", "description"] : resource === "records" ? ["k.dog_name", "k.nick_name", "m.name", "r.administered_by"] : ["k.dog_name", "k.nick_name", "c.condition_name"]
      conditions.push(`(${columns.map((column) => `${column} LIKE ?`).join(" OR ")})`); bindings.push(...columns.map(() => `%${search}%`))
    }
    const hasPagination = params.has("limit")
    const requestedLimit = Number(params.get("limit"))
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(200, Math.floor(requestedLimit))) : 50
    const requestedOffset = Number(params.get("offset") ?? 0)
    const offset = Number.isFinite(requestedOffset) ? Math.max(0, Math.floor(requestedOffset)) : 0
    const base = `${selectSql(resource)} WHERE ${conditions.join(" AND ")}`
    if (params.get("count_only") === "true") {
      const count = await context.env.DB.prepare(`SELECT COUNT(*) AS total${base.slice(base.indexOf(" FROM "))}`).bind(...bindings).first<{ total: number }>()
      return json({ data: [], total: Number(count?.total ?? 0) })
    }
    const [result, count] = await Promise.all([
      context.env.DB.prepare(`${base} ORDER BY ${alias(resource)}.${config.order}${hasPagination ? " LIMIT ? OFFSET ?" : ""}`)
        .bind(...bindings, ...(hasPagination ? [limit, offset] : [])).all(),
      hasPagination
        ? context.env.DB.prepare(`SELECT COUNT(*) AS total${base.slice(base.indexOf(" FROM "))}`).bind(...bindings).first<{ total: number }>()
        : Promise.resolve(null),
    ])
    return json({ data: result.results ?? [], ...(hasPagination ? { total: Number(count?.total ?? 0) } : {}) })
  } catch { return json({ error: "Failed to load medical data" }, 500) }
}

export async function get(context: Context, resource: Resource) {
  const session = await requireSession(context, "view"); if (isResponse(session)) return session
  try {
    const row = await context.env.DB.prepare(`${selectSql(resource)} WHERE ${alias(resource)}.id = ? AND ${alias(resource)}.workspace_id = ?`).bind(context.params.id as string, session.workspace.id).first()
    return row ? json({ data: row }) : json({ error: "Medical record not found" }, 404)
  } catch { return json({ error: "Failed to load medical record" }, 500) }
}

export async function create(context: Context, resource: Resource) {
  const session = await requireSession(context, "create"); if (isResponse(session)) return session
  try {
    const body = await context.request.json() as Record<string, unknown>, values = readBody(body, resource)
    if (typeof values === "string") return json({ error: values }, 400)
    if (!await belongsToWorkspace(context, session, resource, values)) return json({ error: "Selected K9 or medication is not available in this workspace" }, 400)
    const now = new Date().toISOString(), id = crypto.randomUUID(), keys = Object.keys(fields[resource])
    const columns = [...keys, "id", "workspace_id", "created_by_user_id", "created_at", "updated_at"]
    await context.env.DB.prepare(`INSERT INTO ${tables[resource].table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`).bind(...keys.map((key) => values[key]), id, session.workspace.id, session.user.id, now, now).run()
    const row = await context.env.DB.prepare(`${selectSql(resource)} WHERE ${alias(resource)}.id = ? AND ${alias(resource)}.workspace_id = ?`).bind(id, session.workspace.id).first()
    return json({ data: row }, 201)
  } catch { return json({ error: "Failed to create medical record" }, 500) }
}

export async function update(context: Context, resource: Resource) {
  const session = await requireSession(context, "edit"); if (isResponse(session)) return session
  try {
    const id = context.params.id as string, body = await context.request.json() as Record<string, unknown>, values = readBody(body, resource)
    if (typeof values === "string") return json({ error: values }, 400)
    if (!await belongsToWorkspace(context, session, resource, values)) return json({ error: "Selected K9 or medication is not available in this workspace" }, 400)
    const existing = await context.env.DB.prepare(`SELECT id FROM ${tables[resource].table} WHERE id = ? AND workspace_id = ?`).bind(id, session.workspace.id).first()
    if (!existing) return json({ error: "Medical record not found" }, 404)
    const keys = Object.keys(fields[resource])
    await context.env.DB.prepare(`UPDATE ${tables[resource].table} SET ${keys.map((key) => `${key} = ?`).join(", ")}, updated_at = ? WHERE id = ? AND workspace_id = ?`).bind(...keys.map((key) => values[key]), new Date().toISOString(), id, session.workspace.id).run()
    const row = await context.env.DB.prepare(`${selectSql(resource)} WHERE ${alias(resource)}.id = ? AND ${alias(resource)}.workspace_id = ?`).bind(id, session.workspace.id).first()
    return json({ data: row })
  } catch { return json({ error: "Failed to update medical record" }, 500) }
}

export async function remove(context: Context, resource: Resource) {
  const session = await requireSession(context, "delete"); if (isResponse(session)) return session
  try {
    const id = context.params.id as string
    const existing = await context.env.DB.prepare(`SELECT id FROM ${tables[resource].table} WHERE id = ? AND workspace_id = ?`).bind(id, session.workspace.id).first()
    if (!existing) return json({ error: "Medical record not found" }, 404)
    await context.env.DB.prepare(`DELETE FROM ${tables[resource].table} WHERE id = ? AND workspace_id = ?`).bind(id, session.workspace.id).run()
    return json({ success: true })
  } catch { return json({ error: "Could not delete record; it may still be referenced by a medical record" }, 409) }
}