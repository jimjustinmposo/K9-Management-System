type CacheEntry = { value: unknown; expiresAt: number }

const entries = new Map<string, CacheEntry>()
const pending = new Map<string, Promise<unknown>>()
let scope = "anonymous"
let generation = 0

export function setApiCacheScope(nextScope: string | null) {
  const next = nextScope || "anonymous"
  if (scope !== next) {
    scope = next
    generation += 1
    clearApiCache()
  }
}

export function clearApiCache() {
  generation += 1
  entries.clear()
  pending.clear()
}

export function revalidateApiCache() {
  entries.clear()
}

export function invalidateApiCache(path: string) {
  const segments = path.split("?")[0].split("/").filter(Boolean)
  const normalized = `/${segments.slice(0, 2).join("/")}`
  const matches = (key: string) => {
    const marker = key.indexOf(":/api/")
    if (marker < 0) return false
    const cachedPath = key.slice(marker + 1).split("?")[0]
    return cachedPath === normalized || cachedPath.startsWith(`${normalized}/`)
  }
  for (const key of entries.keys()) if (matches(key)) entries.delete(key)
}

export async function cachedApiGet<T>(path: string, load: () => Promise<T>, ttlMs = 30_000): Promise<T> {
  if (!path.startsWith("/api/") || path.startsWith("/api/auth/") || path.startsWith("/api/billing/")) return load()
  const key = `${scope}:${path}`
  const hit = entries.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.value as T
  if (hit) entries.delete(key)
  const existing = pending.get(key)
  if (existing) return existing as Promise<T>
  const requestScope = scope
  const requestGeneration = generation
  let request: Promise<unknown>
  request = load().then((value) => {
    if (scope === requestScope && generation === requestGeneration) entries.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  }).finally(() => { if (pending.get(key) === request) pending.delete(key) })
  pending.set(key, request)
  return request as Promise<T>
}

export async function cachedApiFetch(path: string, load: () => Promise<Response>, ttlMs = 30_000): Promise<Response> {
  const result = await cachedApiGet(path, async () => {
    const response = await load()
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("application/json")) return response
    const body = await response.text()
    const headers = new Headers(response.headers)
    return { status: response.status, statusText: response.statusText, headers: [...headers.entries()], body }
  })
  if (result instanceof Response) return result
  const cached = result as { status: number; statusText: string; headers: [string, string][]; body: string }
  return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers: cached.headers })
}