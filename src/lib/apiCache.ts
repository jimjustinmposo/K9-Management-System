type CacheEntry = { value: unknown; expiresAt: number }

const entries = new Map<string, CacheEntry>()
const pending = new Map<string, Promise<unknown>>()
let scope = "anonymous"
let generation = 0
export const API_CACHE_TTL = 5 * 60_000
const listeners = new Set<() => void>()
const notify = () => { for (const listener of listeners) listener() }
export function subscribeApiCache(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function peekApiCache<T>(path: string): T | undefined {
  const entry = entries.get(`${scope}:${path}`)
  return entry && entry.expiresAt > Date.now() ? entry.value as T : undefined
}

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
  clearApiCache()
}

export function invalidateApiCache(path: string) {
  if (path.split("?")[0].startsWith("/api/dashboard")) {
    clearApiCache()
    notify()
    return
  }
  const segments = path.split("?")[0].split("/").filter(Boolean)
  const normalized = `/${segments.slice(0, 2).join("/")}`
  const resources = new Set([normalized, "/api/dashboard"])
  if (normalized === "/api/k9") {
    for (const resource of ["boarding", "training", "medical", "feeding", "weights", "in-season", "grooming", "car-usage", "food-inventory"]) resources.add(`/api/${resource}`)
  }
  if (normalized === "/api/handlers") { resources.add("/api/training"); resources.add("/api/feeding") }
  if (normalized === "/api/feeding" || normalized === "/api/shopping") resources.add("/api/food-inventory")
  const matches = (key: string) => {
    const marker = key.indexOf(":/api/")
    if (marker < 0) return false
    const cachedPath = key.slice(marker + 1).split("?")[0]
    return [...resources].some((resource) => cachedPath === resource || cachedPath.startsWith(`${resource}/`))
  }
  for (const key of entries.keys()) if (matches(key)) entries.delete(key)
  for (const key of pending.keys()) if (matches(key)) pending.delete(key)
  notify()
}

export async function cachedApiGet<T>(path: string, load: () => Promise<T>, ttlMs = API_CACHE_TTL): Promise<T> {
  if (!path.startsWith("/api/") || /^\/api\/(auth|billing|members)(\/|\?|$)/.test(path)) return load()
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
    if (scope === requestScope && generation === requestGeneration && pending.get(key) === request && !(value instanceof Response)) {
      for (const [oldKey, entry] of entries) if (entry.expiresAt <= Date.now()) entries.delete(oldKey)
      if (entries.size >= 200) entries.delete(entries.keys().next().value!)
      entries.set(key, { value, expiresAt: Date.now() + ttlMs })
    }
    return value
  }).finally(() => { if (pending.get(key) === request) pending.delete(key) })
  pending.set(key, request)
  return request as Promise<T>
}

export async function cachedApiFetch(path: string, load: () => Promise<Response>, ttlMs = API_CACHE_TTL): Promise<Response> {
  const result = await cachedApiGet(path, async () => {
    const response = await load()
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("application/json")) return response
    const body = await response.text()
    const headers = new Headers(response.headers)
    return { status: response.status, statusText: response.statusText, headers: [...headers.entries()], body }
  }, ttlMs)
  if (result instanceof Response) return result.clone()
  const cached = result as { status: number; statusText: string; headers: [string, string][]; body: string }
  return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers: cached.headers })
}