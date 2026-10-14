import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createLatestLoad } from "./latestLoad"

// Callers memoize read; stable setters keep configuration changes query-specific.
export function useLatestLoad<T>(read: () => Promise<T>, success: (value: T) => void, setLoading: (value: boolean) => void, setError: (value: string) => void, fallback: string, search = "") {
  const [loader] = useState(createLatestLoad)
  const lastStartedSearch = useRef(search)
  useLayoutEffect(() => {
    loader.configure(read, () => { setLoading(true); setError("") }, success,
      (error) => setError(error instanceof Error ? error.message : fallback), () => setLoading(false))
    setLoading(true)
    setError("")
    return () => loader.stop()
  }, [loader, read, success, setLoading, setError, fallback])
  useEffect(() => {
    loader.schedule(search === lastStartedSearch.current ? 0 : 250, () => { lastStartedSearch.current = search })
  }, [loader, read, search])
  return loader.run
}