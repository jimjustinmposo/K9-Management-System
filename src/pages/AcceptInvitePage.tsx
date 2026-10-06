import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import AuthLayout, { authInput, primaryButton } from "../components/AuthLayout"
import { apiRequest, useAuth } from "../lib/auth"
export default function AcceptInvitePage() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { refresh } = useAuth()
  const [error, setError] = useState("")
  return (
    <AuthLayout
      title="Join the team"
      subtitle="Create your member account to access this Sentinel workspace."
    >
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setError("")
          const f = new FormData(e.currentTarget)
          try {
            await apiRequest("/api/auth/accept-invite", {
              method: "POST",
              body: JSON.stringify({
                token: params.get("token"),
                name: f.get("name"),
                password: f.get("password"),
              }),
            })
            await refresh()
            nav("/")
          } catch (err) {
            setError(err instanceof Error ? err.message : "Invitation failed")
          }
        }}
      >
        <label className="block text-xs font-bold">
          Your name
          <input name="name" required className={authInput} />
        </label>
        <label className="block text-xs font-bold">
          Password
          <input
            name="password"
            type="password"
            minLength={10}
            required
            className={authInput}
          />
        </label>
        {error && <p className="text-xs text-danger">{error}</p>}
        <button className={primaryButton}>Accept invitation</button>
      </form>
    </AuthLayout>
  )
}
