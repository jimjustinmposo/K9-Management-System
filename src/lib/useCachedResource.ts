import { useCallback, useEffect, useState } from "react"
import { API_CACHE_TTL, cachedApiGet, invalidateApiCache, peekApiCache, subscribeApiCache } from "./apiCache"

// Stable read functions and resource keys let route remounts reuse mapped records.
export function useCachedResource<T>(path: string, read: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(() => peekApiCache<T>(path))
  const [loading, setLoading] = useState(() => peekApiCache(path) === undefined)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    let version = 0
    const load = () => {
      const current = ++version
      const cached = peekApiCache<T>(path)
      setData(cached)
      setLoading(cached === undefined)
      setError("")
      void cachedApiGet(path, read).then((value) => {
        if (active && current === version) setData(value)
      }, (reason: unknown) => {
        if (active && current === version) setError(reason instanceof Error ? reason.message : "Could not load records.")
      }).finally(() => { if (active && current === version) setLoading(false) })
    }
    const unsubscribe = subscribeApiCache(load)
    const refreshExpired = () => {
      if (document.visibilityState === "visible" && peekApiCache(path) === undefined) load()
    }
    load()
    const timer = window.setInterval(refreshExpired, API_CACHE_TTL)
    window.addEventListener("focus", refreshExpired)
    document.addEventListener("visibilitychange", refreshExpired)
    return () => {
      active = false
      unsubscribe()
      window.clearInterval(timer)
      window.removeEventListener("focus", refreshExpired)
      document.removeEventListener("visibilitychange", refreshExpired)
    }
  }, [path, read])
  const refresh = useCallback(() => invalidateApiCache(path), [path])
  return { data, setData, loading, error, setError, refresh }
}