import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { Navigate, useLocation } from "react-router-dom"
import { createSessionController } from "./sessionController"
import { cachedApiGet, clearApiCache, invalidateApiCache, setApiCacheScope } from "./apiCache"

export type Session = {
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

const AuthContext = createContext<{
  session: Session | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
} | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [controller] = useState(() => createSessionController<Session>(
    async () => {
      try {
        const response = await fetch("/api/auth/session", { credentials: "same-origin" })
        const data = await response.json()
        const nextSession = response.ok ? data.data : null
        setApiCacheScope(nextSession ? `${nextSession.workspace?.id}:${nextSession.user?.id}:${JSON.stringify(nextSession.permissions)}:${JSON.stringify(nextSession.subscription)}` : null)
        return nextSession
      } catch (error) {
        setApiCacheScope(null)
        throw error
      }
    },
    async () => { clearApiCache(); await fetch("/api/auth/logout", { method: "POST" }) },
    setSession,
    () => setLoading(false),
  ))
  useEffect(() => {
    void controller.start()
    const poll = window.setInterval(() => void controller.refresh(false), 15_000)
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void controller.refresh(false)
      }
    }
    document.addEventListener("visibilitychange", refreshWhenVisible)
    window.addEventListener("focus", refreshWhenVisible)
    return () => {
      controller.stop()
      window.clearInterval(poll)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
      window.removeEventListener("focus", refreshWhenVisible)
    }
  }, [controller])
  return (
    <AuthContext.Provider value={{ session, loading, refresh: controller.refresh, logout: controller.logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("AuthProvider is missing")
  return value
}

export function ProtectedRoute({
  children,
  owner = false,
  requireWritable = false,
}: {
  children: ReactNode
  owner?: boolean
  requireWritable?: boolean
}) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-sm font-bold text-muted">
        Loading Sentinel…
      </div>
    )
  if (!session)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (owner && session.role !== "owner") return <Navigate to="/" replace />
  if (requireWritable && !session.subscription.writable)
    return <Navigate to="/" replace />
  return <div className="contents" key={`${session.workspace.id}:${session.user.id}:${JSON.stringify(session.permissions)}:${JSON.stringify(session.subscription)}`}>{children}</div>
}

export async function apiRequest(path: string, init?: RequestInit) {
  const method = (init?.method ?? "GET").toUpperCase()
  const load = async () => {
    const response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message =
        typeof data.error === "string"
          ? data.error
          : typeof data.error?.message === "string"
            ? data.error.message
            : "Request failed"
      throw new Error(message)
    }
    return data
  }
  if (method === "GET") return cachedApiGet(path, load)
  const result = await load()
  invalidateApiCache(path)
  return result
}
