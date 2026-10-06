import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import AuthLayout from "../components/AuthLayout"
import { useAuth } from "../lib/auth"

export default function BillingSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [error, setError] = useState("")

  useEffect(() => {
    const sessionId = searchParams.get("session_id")
    if (!sessionId) {
      setError("Stripe did not return a Checkout Session ID.")
      return
    }
    let attempts = 0
    const check = window.setInterval(async () => {
      attempts += 1
      const response = await fetch("/api/auth/session", { cache: "no-store" })
      const result = await response.json().catch(() => ({}))
      if (response.ok && result.data?.subscription?.writable) {
        window.clearInterval(check)
        await refresh()
        navigate("/", { replace: true, state: { subscriptionActivated: true } })
      } else if (attempts >= 15) {
        window.clearInterval(check)
        setError("Payment succeeded, but Stripe has not confirmed the subscription yet. Please refresh in a moment.")
      }
    }, 1000)
    return () => window.clearInterval(check)
  }, [navigate, refresh, searchParams])

  return (
    <AuthLayout
      title={error ? "Payment verification needed" : "Activating Sentinel"}
      subtitle={
        error
          ? error
          : "Your payment was successful. We are confirming your subscription and opening your dashboard."
      }
    >
      {!error ? (
        <div className="mt-6 flex items-center gap-3 rounded-xl bg-positive-soft p-4 text-sm font-bold text-positive">
          <span className="size-3 animate-pulse rounded-full bg-positive" />
          Verifying subscription…
        </div>
      ) : (
        <Link
          to="/subscription"
          className="mt-6 block rounded-xl bg-navy px-5 py-3 text-center text-sm font-bold text-white"
        >
          Return to subscription
        </Link>
      )}
    </AuthLayout>
  )
}
