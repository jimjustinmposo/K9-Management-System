import { useState, type FormEvent, type ReactNode } from "react"
import { LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { apiRequest, useAuth } from "../../lib/auth"

type AuthMode = "sign-in" | "sign-up"

export default function AuthSwitch({
  initialMode = "sign-in",
}: {
  initialMode?: AuthMode
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const isSignUp = mode === "sign-up"

  const switchMode = (nextMode: AuthMode) => {
    setError("")
    setMode(nextMode)
  }

  const submitSignIn = async (event: FormEvent<HTMLFormElement>) => {
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed")
    } finally {
      setSaving(false)
    }
  }

  const submitSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    const form = new FormData(event.currentTarget)
    try {
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      })
      await refresh()
      navigate("/", { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Registration failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="auth-switch">
      <style>{`
        .auth-switch,
        .auth-switch * { box-sizing: border-box; }
        .auth-switch {
          --auth-dark: #151d18;
          --auth-mid: #26352b;
          --auth-accent: #d0b47b;
          --auth-canvas: #101613;
          min-height: 100vh;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          overflow: hidden;
          background:
            radial-gradient(circle at 12% 15%, rgba(208, 180, 123, .12), transparent 28%),
            linear-gradient(135deg, #101613 0%, var(--auth-dark) 48%, var(--auth-mid) 100%);
        }
        .auth-switch__container {
          position: relative;
          width: 100%;
          max-width: 960px;
          height: 610px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, .18);
          border-radius: 24px;
          background: #1d2722;
          box-shadow: 0 30px 80px rgba(0, 0, 0, .42);
        }
        .auth-switch__forms,
        .auth-switch__panels { position: absolute; inset: 0; }
        .auth-switch__form-stack {
          position: absolute;
          top: 50%;
          left: 75%;
          z-index: 5;
          display: grid;
          width: 50%;
          transform: translate(-50%, -50%);
          transition: 1s .7s ease-in-out;
        }
        .auth-switch__form {
          grid-column: 1 / 2;
          grid-row: 1 / 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0 4rem;
          overflow: hidden;
          transition: opacity .2s .7s;
        }
        .auth-switch__form--signup { z-index: 1; opacity: 0; pointer-events: none; }
        .auth-switch__form--signin { z-index: 2; }
        .auth-switch__brand { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
        .auth-switch__logo {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          object-fit: contain;
          padding: 3px;
          background: #fff;
          box-shadow: 0 5px 18px rgba(19, 38, 45, .12);
        }
        .auth-switch__brand-copy { color: #f1f3ed; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
        .auth-switch__title { margin: 0 0 6px; color: #f1f3ed; font-family: Rajdhani, "Arial Narrow", sans-serif; font-size: 2rem; font-weight: 700; letter-spacing: .01em; }
        .auth-switch__subtitle { margin: 0 0 16px; color: #a7b3aa; font-size: .82rem; text-align: center; }
        .auth-switch__field {
          display: grid;
          grid-template-columns: 48px 1fr;
          align-items: center;
          width: 100%;
          height: 52px;
          margin: 7px 0;
          border: 1px solid #344139;
          border-radius: 14px;
          background: var(--auth-canvas);
          transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .auth-switch__field:focus-within {
          border-color: var(--auth-accent);
          background: #101613;
          box-shadow: 0 0 0 3px rgba(208, 180, 123, .18);
        }
        .auth-switch__field-icon { display: grid; place-items: center; color: #a7b3aa; }
        .auth-switch__field input {
          width: 100%;
          height: 100%;
          padding: 0 14px 0 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #f1f3ed;
          font-size: .9rem;
          font-weight: 600;
        }
        .auth-switch__field input::placeholder { color: #a7b3aa; font-weight: 500; }
        .auth-switch__button {
          min-width: 154px;
          height: 48px;
          margin: 12px 0 0;
          padding: 0 24px;
          border: 0;
          border-radius: 999px;
          color: #101613;
          background: var(--auth-accent);
          font-size: .78rem;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          transition: transform .2s, background .2s, box-shadow .2s;
        }
        .auth-switch__button:hover:not(:disabled) { transform: translateY(-1px); background: #dfc997; box-shadow: 0 8px 20px rgba(0, 0, 0, .24); }
        .auth-switch__button:disabled { cursor: not-allowed; opacity: .6; }
        .auth-switch__button:focus-visible,
        .auth-switch__link:focus-visible {
          outline: 3px solid #d0b47b;
          outline-offset: 3px;
        }
        .auth-switch__link { margin-top: 14px; color: #d0b47b; font-size: .75rem; font-weight: 700; text-decoration: none; }
        .auth-switch__link:hover { text-decoration: underline; }
        .auth-switch__error { width: 100%; margin: 8px 0 0; color: #d27a68; font-size: .72rem; font-weight: 700; text-align: center; }
        .auth-switch__hint { margin: 8px 0 0; color: #a7b3aa; font-size: .68rem; }
        .auth-switch__panels { z-index: 6; display: grid; grid-template-columns: repeat(2, 1fr); pointer-events: none; }
        .auth-switch__panel { display: flex; align-items: flex-end; justify-content: space-around; flex-direction: column; text-align: center; }
        .auth-switch__panel--left { padding: 3rem 17% 3rem 10%; pointer-events: auto; }
        .auth-switch__panel--right { padding: 3rem 10% 3rem 17%; }
        .auth-switch__panel-content { color: #fff; transition: transform .9s ease-in-out .6s; }
        .auth-switch__panel h2 { margin: 0 0 12px; color: #f1f3ed; font-family: Rajdhani, "Arial Narrow", sans-serif; font-size: 1.8rem; font-weight: 700; }
        .auth-switch__panel p { max-width: 310px; margin: 0 auto 22px; color: rgba(255, 255, 255, .76); font-size: .9rem; line-height: 1.65; }
        .auth-switch__button--outline { margin: 0; border: 2px solid rgba(255, 255, 255, .82); background: transparent; }
        .auth-switch__button--outline:hover:not(:disabled) { background: rgba(255, 255, 255, .1); box-shadow: none; }
        .auth-switch__panel--right .auth-switch__panel-content { transform: translateX(800px); }
        .auth-switch__container::before {
          content: "";
          position: absolute;
          z-index: 6;
          top: -10%;
          right: 48%;
          width: 2000px;
          height: 2000px;
          border-radius: 50%;
          transform: translateY(-50%);
            background:
            radial-gradient(circle at 64% 68%, rgba(208, 180, 123, .16), transparent 18%),
            linear-gradient(-45deg, #101613 0%, var(--auth-dark) 55%, #354638 100%);
          transition: 1.8s ease-in-out;
        }
        .auth-switch__container--signup::before { right: 52%; transform: translate(100%, -50%); }
        .auth-switch__container--signup .auth-switch__form-stack { left: 25%; }
        .auth-switch__container--signup .auth-switch__form--signup { z-index: 2; opacity: 1; pointer-events: auto; }
        .auth-switch__container--signup .auth-switch__form--signin { z-index: 1; opacity: 0; pointer-events: none; }
        .auth-switch__container--signup .auth-switch__panel--left { pointer-events: none; }
        .auth-switch__container--signup .auth-switch__panel--right { pointer-events: auto; }
        .auth-switch__container--signup .auth-switch__panel--left .auth-switch__panel-content { transform: translateX(-800px); }
        .auth-switch__container--signup .auth-switch__panel--right .auth-switch__panel-content { transform: translateX(0); }
        @media (max-width: 870px) {
          .auth-switch { padding: 0; }
          .auth-switch__container { min-height: 760px; height: 100vh; border: 0; border-radius: 0; }
          .auth-switch__form-stack { top: 96%; left: 50%; width: 100%; transform: translate(-50%, -100%); transition: 1s .8s ease-in-out; }
          .auth-switch__container--signup .auth-switch__form-stack { top: 4%; left: 50%; transform: translate(-50%, 0); }
          .auth-switch__form { padding: 0 max(1.5rem, 16vw); }
          .auth-switch__panels { grid-template-columns: 1fr; grid-template-rows: 1fr 2fr 1fr; }
          .auth-switch__panel { grid-column: 1 / 2; flex-direction: row; align-items: center; padding: 2rem 8%; }
          .auth-switch__panel--left { grid-row: 1 / 2; }
          .auth-switch__panel--right { grid-row: 3 / 4; }
          .auth-switch__panel-content { padding-right: 14%; }
          .auth-switch__panel h2 { font-size: 1.25rem; }
          .auth-switch__panel p { margin-bottom: 12px; font-size: .72rem; line-height: 1.45; }
          .auth-switch__button--outline { min-width: 116px; height: 38px; font-size: .68rem; }
          .auth-switch__container::before { top: auto; right: auto; bottom: 68%; left: 30%; width: 1500px; height: 1500px; transform: translateX(-50%); transition: 2s ease-in-out; }
          .auth-switch__container--signup::before { right: auto; bottom: 32%; transform: translate(-50%, 100%); }
          .auth-switch__panel--right .auth-switch__panel-content { transform: translateY(300px); }
          .auth-switch__container--signup .auth-switch__panel--left .auth-switch__panel-content { transform: translateY(-300px); }
          .auth-switch__container--signup .auth-switch__panel--right .auth-switch__panel-content { transform: translateY(0); }
        }
        @media (max-width: 570px) {
          .auth-switch__form { padding: 0 1.5rem; }
          .auth-switch__panel { padding-inline: 1.25rem; }
          .auth-switch__panel-content { padding-right: .75rem; }
          .auth-switch__title { font-size: 1.75rem; }
          .auth-switch__brand { margin-bottom: 10px; }
          .auth-switch__field { height: 48px; margin: 5px 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-switch__container::before,
          .auth-switch__form-stack,
          .auth-switch__form,
          .auth-switch__panel-content { transition-duration: .01ms; transition-delay: 0ms; }
        }
      `}</style>

      <div className={`auth-switch__container${isSignUp ? " auth-switch__container--signup" : ""}`}>
        <div className="auth-switch__forms">
          <div className="auth-switch__form-stack">
            <form className="auth-switch__form auth-switch__form--signin" onSubmit={submitSignIn}>
              <Brand />
              <h1 className="auth-switch__title">Welcome back</h1>
              <p className="auth-switch__subtitle">Sign in to Martina&apos;s K9 Management System.</p>
              <AuthField icon={<Mail size={19} />} label="Email address">
                <input name="email" type="email" placeholder="Email address" autoComplete="email" required />
              </AuthField>
              <AuthField icon={<LockKeyhole size={19} />} label="Password">
                <input name="password" type="password" placeholder="Password" autoComplete="current-password" required />
              </AuthField>
              {!isSignUp && error && <p className="auth-switch__error" role="alert">{error}</p>}
              <button className="auth-switch__button" disabled={saving}>
                {saving ? "Signing in…" : "Sign in"}
              </button>
              <Link className="auth-switch__link" to="/forgot-password">Forgot your password?</Link>
            </form>

            <form className="auth-switch__form auth-switch__form--signup" onSubmit={submitSignUp}>
              <Brand />
              <h1 className="auth-switch__title">Create account</h1>
              <p className="auth-switch__subtitle">Create your owner account and K9 workspace.</p>
              <AuthField icon={<UserRound size={19} />} label="Your name">
                <input name="name" placeholder="Your name" autoComplete="name" required />
              </AuthField>
              <AuthField icon={<ShieldCheck size={19} />} label="Workspace name">
                <input name="workspaceName" placeholder="K9 unit name" autoComplete="organization" required />
              </AuthField>
              <AuthField icon={<Mail size={19} />} label="Email address">
                <input name="email" type="email" placeholder="Email address" autoComplete="email" required />
              </AuthField>
              <AuthField icon={<LockKeyhole size={19} />} label="Password">
                <input name="password" type="password" placeholder="Password" minLength={6} autoComplete="new-password" required />
              </AuthField>
              <p className="auth-switch__hint">Use at least 6 characters.</p>
              {isSignUp && error && <p className="auth-switch__error" role="alert">{error}</p>}
              <button className="auth-switch__button" disabled={saving}>
                {saving ? "Creating…" : "Create account"}
              </button>
            </form>
          </div>
        </div>

        <div className="auth-switch__panels">
          <section className="auth-switch__panel auth-switch__panel--left">
            <div className="auth-switch__panel-content">
              <h2>New to the unit?</h2>
              <p>Create your secure workspace and start managing your K9 operation in one place.</p>
              <button type="button" className="auth-switch__button auth-switch__button--outline" onClick={() => switchMode("sign-up")}>Sign up</button>
            </div>
          </section>
          <section className="auth-switch__panel auth-switch__panel--right">
            <div className="auth-switch__panel-content">
              <h2>Already registered?</h2>
              <p>Welcome back. Sign in to continue managing your team, training, and K9 records.</p>
              <button type="button" className="auth-switch__button auth-switch__button--outline" onClick={() => switchMode("sign-in")}>Sign in</button>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function Brand() {
  return (
    <div className="auth-switch__brand">
      <img className="auth-switch__logo" src="/logo.png" alt="" />
      <span className="auth-switch__brand-copy">Martina&apos;s K9 System</span>
    </div>
  )
}

function AuthField({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <label className="auth-switch__field">
      <span className="auth-switch__field-icon" aria-hidden="true">{icon}</span>
      <span className="sr-only">{label}</span>
      {children}
    </label>
  )
}
