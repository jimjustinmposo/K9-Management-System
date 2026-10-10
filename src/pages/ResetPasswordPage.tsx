import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import AuthLayout, { authInput, primaryButton } from "../components/AuthLayout"
import { apiRequest } from "../lib/auth"
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Use at least 6 characters."
    >
      {!token ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-danger">
            This password reset link is invalid. Request a new link to continue.
          </p>
          <Link
            to="/forgot-password"
            className={`${primaryButton} block text-center`}
          >
            Request a new link
          </Link>
        </div>
      ) : done ? (
        <Link to="/login" className={`${primaryButton} mt-6 block text-center`}>
          Continue to sign in
        </Link>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setError("")
            setSaving(true)
            try {
              const f = new FormData(e.currentTarget)
              const password = String(f.get("password") ?? "")
              const confirmPassword = String(f.get("confirmPassword") ?? "")
              if (password !== confirmPassword) {
                setError("Passwords do not match")
                return
              }
              await apiRequest("/api/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({
                  token,
                  password,
                }),
              })
              setDone(true)
            } catch (err) {
              setError(err instanceof Error ? err.message : "Reset failed")
            } finally {
              setSaving(false)
            }
          }}
        >
          <label className="block text-xs font-bold">
            New password
            <input
              className={authInput}
              name="password"
              type="password"
              minLength={6}
              required
            />
          </label>
          <label className="block text-xs font-bold">
            Confirm new password
            <input
              className={authInput}
              name="confirmPassword"
              type="password"
              minLength={6}
              required
            />
          </label>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button className={primaryButton} disabled={saving}>
            {saving ? "Resetting…" : "Reset password"}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
