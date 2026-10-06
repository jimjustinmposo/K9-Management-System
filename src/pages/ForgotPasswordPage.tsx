import { useState } from "react"
import { Link } from "react-router-dom"
import AuthLayout, { authInput, primaryButton } from "../components/AuthLayout"
import { apiRequest } from "../lib/auth"
export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We’ll email a secure reset link if the account exists."
    >
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setError("")
          try {
            const f = new FormData(e.currentTarget)
            const data = await apiRequest("/api/auth/forgot-password", {
              method: "POST",
              body: JSON.stringify({ email: f.get("email") }),
            })
            setMessage(data.message)
          } catch (err) {
            setError(err instanceof Error ? err.message : "Request failed")
          }
        }}
      >
        <label className="block text-xs font-bold">
          Email
          <input name="email" type="email" required className={authInput} />
        </label>
        {message && <p className="text-xs text-positive">{message}</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
        <button className={primaryButton}>Send reset link</button>
      </form>
      <Link
        to="/login"
        className="mt-5 block text-center text-xs font-bold text-info"
      >
        Back to sign in
      </Link>
    </AuthLayout>
  )
}
