import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import AuthLayout from "../components/AuthLayout"
import { apiRequest, useAuth } from "../lib/auth"

export default function BillingSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [error, setError] = useState("")

  useEffect(() => {
    const subscriptionId = searchParams.get("subscription_id")
    if (!subscriptionId) {
      setError("PayPal did not return a subscription ID.")
      return
    }
    let cancelled = false
    async function confirm() {
      try {
        await apiRequest("/api/billing/confirm", {
          method: "POST",
          body: JSON.stringify({ subscriptionId }),
        })
        if (cancelled) return
        await refresh()
        navigate("/", { replace: true, state: { subscriptionActivated: true } })
      } catch (cause) {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : "PayPal could not confirm the subscription.")
      }
    }
    void confirm()
    return () => { cancelled = true }
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
