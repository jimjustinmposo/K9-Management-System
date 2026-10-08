import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import AuthLayout, { authInput, primaryButton } from "../components/AuthLayout"
import { apiRequest } from "../lib/auth"
export default function ResetPasswordPage() {
  const [token] = useSearchParams()
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Use at least 6 characters."
    >
      {done ? (
        <Link to="/login" className={`${primaryButton} mt-6 block text-center`}>
          Continue to sign in
        </Link>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setError("")
            try {
              const f = new FormData(e.currentTarget)
              await apiRequest("/api/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({
                  token: token.get("token"),
                  password: f.get("password"),
                }),
              })
              setDone(true)
            } catch (err) {
              setError(err instanceof Error ? err.message : "Reset failed")
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
          {error && <p className="text-xs text-danger">{error}</p>}
          <button className={primaryButton}>Reset password</button>
        </form>
      )}
    </AuthLayout>
  )
}
