import { useState, type FormEvent } from "react"
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail } from "lucide-react"
import { Link } from "react-router-dom"
import AuthLayout, { authInput, primaryButton } from "../components/AuthLayout"
import { apiRequest } from "../lib/auth"

export default function ForgotPasswordPage() {
  const [secretVerified, setSecretVerified] = useState(false)
  const [verifiedSecret, setVerifiedSecret] = useState("")
  const [showSecret, setShowSecret] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSaving(true)
    const form = new FormData(event.currentTarget)
    if (!secretVerified) {
      const secret = String(form.get("secret") ?? "")
      try {
        await apiRequest("/api/auth/developer-reset", {
          method: "POST",
          body: JSON.stringify({ action: "verify", secret }),
        })
        setVerifiedSecret(secret)
        setSecretVerified(true)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Secret verification failed")
      } finally {
        setSaving(false)
      }
      return
    }
    const password = String(form.get("password") ?? "")
    const confirmPassword = String(form.get("confirmPassword") ?? "")
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setSaving(false)
      return
    }
    try {
      await apiRequest("/api/auth/developer-reset", {
        method: "POST",
        body: JSON.stringify({
          secret: verifiedSecret,
          email: form.get("email"),
          password,
        }),
      })
      setDone(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password reset failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthLayout
      title={done ? "Password updated" : "Reset your password"}
      subtitle={
        done
          ? "Your password has been changed. Sign in with your new password."
          : secretVerified
            ? "Enter the account email and your new password."
            : "Enter the developer secret password to continue."
      }
    >
      {done ? (
        <Link to="/login" className={`${primaryButton} mt-6 block text-center`}>
          Continue to sign in
        </Link>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {!secretVerified ? (
            <label className="block text-xs font-bold">
              Developer secret password
              <span className="relative mt-1.5 block">
                <KeyRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  className={`${authInput} !mt-0 !pl-10 !pr-12`}
                  name="secret"
                  type={showSecret ? "text" : "password"}
                  autoComplete="off"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((visible) => !visible)}
                  aria-label={showSecret ? "Hide developer secret" : "Show developer secret"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink"
                >
                  {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>
          ) : (
            <>
              <label className="block text-xs font-bold">
                Account email
                <span className="relative mt-1.5 block">
                  <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input className={`${authInput} !mt-0 !pl-10`} name="email" type="email" autoComplete="email" required />
                </span>
              </label>
              <label className="block text-xs font-bold">
                New password
                <span className="relative mt-1.5 block">
                  <LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input className={`${authInput} !mt-0 !pl-10 !pr-12`} name="password" type={showPassword ? "text" : "password"} minLength={6} autoComplete="new-password" required />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide new password" : "Show new password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink">
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </label>
              <label className="block text-xs font-bold">
                Re-enter new password
                <span className="relative mt-1.5 block">
                  <LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input className={`${authInput} !mt-0 !pl-10 !pr-12`} name="confirmPassword" type={showConfirmation ? "text" : "password"} minLength={6} autoComplete="new-password" required />
                  <button type="button" onClick={() => setShowConfirmation((visible) => !visible)} aria-label={showConfirmation ? "Hide password confirmation" : "Show password confirmation"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink">
                    {showConfirmation ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </label>
            </>
          )}
          {error && <p role="alert" className="text-xs font-semibold text-danger">{error}</p>}
          <button className={primaryButton} disabled={saving}>
            {saving ? "Please wait…" : secretVerified ? "Update password" : "Verify secret password"}
          </button>
        </form>
      )}
      <Link to="/login" className="mt-5 block text-center text-xs font-bold text-info">
        Back to sign in
      </Link>
    </AuthLayout>
  )
}