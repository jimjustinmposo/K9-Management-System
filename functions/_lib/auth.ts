import { json } from "./http"

export interface AppEnv {
  DB: D1Database
  RESEND_API_KEY?: string
  RESEND_FROM_EMAIL?: string
  APP_URL?: string
}

export interface SessionInfo {
  user: { id: string; email: string; name: string }
  workspace: { id: string; name: string }
  role: "owner" | "member"
  subscription: {
    status: string
    interval: string
    currentPeriodEnd: string | null
    writable: boolean
    hasSubscription: boolean
  }
  permissions: {
    view: true
    create: boolean
    edit: boolean
    delete: boolean
    manageMembers: boolean
    manageBilling: boolean
    viewAdmin: boolean
  }
}

const encoder = new TextEncoder()
function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}
function bytesToBase64(bytes: Uint8Array): string {
  let value = ""
  for (const byte of bytes) value += String.fromCharCode(byte)
  return btoa(value)
}
function base64ToBuffer(value: string): ArrayBuffer {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
    .buffer as ArrayBuffer
}

export async function hashToken(token: string): Promise<string> {
  return bytesToHex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(token)),
    ),
  )
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return bytesToBase64(bytes)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
}

export async function hashPassword(
  password: string,
  salt = bytesToBase64(crypto.getRandomValues(new Uint8Array(16))),
): Promise<{ hash: string; salt: string }> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: base64ToBuffer(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  )
  return { hash: bytesToBase64(new Uint8Array(bits)), salt }
}

export async function verifyPassword(
  password: string,
  salt: string,
  expected: string,
): Promise<boolean> {
  const actual = await hashPassword(password, salt)
  if (actual.hash.length !== expected.length) return false
  let diff = 0
  for (let index = 0; index < expected.length; index += 1)
    diff |= actual.hash.charCodeAt(index) ^ expected.charCodeAt(index)
  return diff === 0
}

function cookie(request: Request, name: string): string {
  const raw = request.headers.get("Cookie") ?? ""
  const part = raw
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
  return part ? decodeURIComponent(part.slice(name.length + 1)) : ""
}

export async function createSession(
  db: D1Database,
  userId: string,
): Promise<string> {
  const token = randomToken()
  const now = new Date()
  const expires = new Date(now.getTime() + 30 * 86400000)
  await db
    .prepare(
      "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(
      crypto.randomUUID(),
      userId,
      await hashToken(token),
      expires.toISOString(),
      now.toISOString(),
    )
    .run()
  return `sentinel_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
}

export const clearSessionCookie =
  "sentinel_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"

export async function getSession(
  request: Request,
  db: D1Database,
): Promise<SessionInfo | null> {
  const token = cookie(request, "sentinel_session")
  if (!token) return null
  const row = await db
    .prepare(`SELECT u.id user_id, u.email, u.name user_name, w.id workspace_id, w.name workspace_name,
    m.role, w.subscription_status, w.billing_interval, w.current_period_end
    FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id
    JOIN workspaces w ON w.id=m.workspace_id WHERE s.token_hash=? AND s.expires_at>?`)
    .bind(await hashToken(token), new Date().toISOString())
    .first<any>()
  if (!row) return null
  const hasSubscription = false
  const writable = hasSubscription && ["active", "trialing"].includes(row.subscription_status)
  const owner = row.role === "owner"
  return {
    user: { id: row.user_id, email: row.email, name: row.user_name },
    workspace: { id: row.workspace_id, name: row.workspace_name },
    role: row.role,
    subscription: {
      status: row.subscription_status,
      interval: row.billing_interval,
      currentPeriodEnd: row.current_period_end,
      writable,
      hasSubscription,
    },
    permissions: {
      view: true,
      create: writable,
      edit: writable && owner,
      delete: writable && owner,
      manageMembers: writable && owner,
      manageBilling: owner,
      viewAdmin: owner,
    },
  }
}

export async function requireSession(
  context: PagesFunctionContext<AppEnv>,
  permission?: keyof SessionInfo["permissions"],
): Promise<SessionInfo | Response> {
  const session = await getSession(context.request, context.env.DB)
  if (!session) return json({ error: "Authentication required" }, 401)
  if (permission && !session.permissions[permission])
    return json(
      {
        error: session.subscription.writable
          ? "You do not have permission for this action"
          : "Subscription is read-only",
      },
      403,
    )
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    const origin = context.request.headers.get("Origin")
    if (origin && origin !== new URL(context.request.url).origin)
      return json({ error: "Invalid request origin" }, 403)
  }
  return session
}

export function isResponse(value: SessionInfo | Response): value is Response {
  return value instanceof Response
}
