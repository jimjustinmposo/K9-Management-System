import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { Navigate, useLocation } from "react-router-dom"

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
  async function refresh() {
    try {
      const response = await fetch("/api/auth/session", {
        credentials: "same-origin",
      })
      const data = await response.json()
      setSession(response.ok ? data.data : null)
    } catch {
      setSession(null)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void refresh()
    const poll = window.setInterval(() => void refresh(), 15_000)
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh()
    }
    document.addEventListener("visibilitychange", refreshWhenVisible)
    window.addEventListener("focus", refreshWhenVisible)
    return () => {
      window.clearInterval(poll)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
      window.removeEventListener("focus", refreshWhenVisible)
    }
  }, [])
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    setSession(null)
  }
  return (
    <AuthContext.Provider value={{ session, loading, refresh, logout }}>
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
  return children
}

export async function apiRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || "Request failed")
  return data
}
