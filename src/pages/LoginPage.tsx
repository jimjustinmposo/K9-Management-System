import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import AuthLayout, { authInput, primaryButton } from "../components/AuthLayout"
import { apiRequest, useAuth } from "../lib/auth"

export default function LoginPage() {
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const { refresh } = useAuth()
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your K9 Management System."
    >
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setSaving(true)
          setError("")
          const form = new FormData(event.currentTarget)
          try {
            await apiRequest("/api/auth/login", {
              method: "POST",
              body: JSON.stringify({
                email: form.get("email"),
                password: form.get("password"),
              }),
            })
            await refresh()
            navigate("/", { replace: true })
          } catch (e) {
            setError(e instanceof Error ? e.message : "Sign in failed")
          } finally {
            setSaving(false)
          }
        }}
      >
        <label className="block text-xs font-bold">
          Email
          <input
            className={authInput}
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="block text-xs font-bold">
          Password
          <input
            className={authInput}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-xs font-semibold text-danger">
            {error}
          </p>
        )}
        <button className={primaryButton} disabled={saving}>
          {saving ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="mt-5 flex justify-between text-xs">
        <Link className="font-bold text-info" to="/forgot-password">
          Forgot password?
        </Link>
        <Link className="font-bold text-info" to="/register">
          Create account
        </Link>
      </div>
    </AuthLayout>
  )
}
