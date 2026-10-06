import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import AuthLayout, { authInput, primaryButton } from "../components/AuthLayout"
import { apiRequest, useAuth } from "../lib/auth"

export default function RegisterPage() {
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const { refresh } = useAuth()
  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Start with one owner account and invite up to three members after subscribing."
    >
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setSaving(true)
          setError("")
          const form = new FormData(event.currentTarget)
          try {
            const result = await apiRequest("/api/auth/register", {
              method: "POST",
              body: JSON.stringify(Object.fromEntries(form)),
            })
            await refresh()
            navigate(result.devMode ? "/" : "/subscribe")
          } catch (e) {
            setError(e instanceof Error ? e.message : "Registration failed")
          } finally {
            setSaving(false)
          }
        }}
      >
        <label className="block text-xs font-bold">
          Your name
          <input
            className={authInput}
            name="name"
            autoComplete="name"
            required
          />
        </label>
        <label className="block text-xs font-bold">
          Workspace name
          <input
            className={authInput}
            name="workspaceName"
            placeholder="Martina K9 Unit"
            required
          />
        </label>
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
            minLength={10}
            autoComplete="new-password"
            required
          />
          <span className="mt-1 block font-medium text-muted">
            At least 10 characters
          </span>
        </label>
        {error && (
          <p role="alert" className="text-xs font-semibold text-danger">
            {error}
          </p>
        )}
        <button className={primaryButton} disabled={saving}>
          {saving ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-muted">
        Already registered?{" "}
        <Link to="/login" className="font-bold text-info">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
