import { useState, type FormEvent, type ReactNode } from "react"
import { LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
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
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const isSignUp = mode === "sign-up"
  const oauthError = searchParams.get("oauth_error")

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
          --auth-dark: #13262d;
          --auth-mid: #1d3a43;
          --auth-accent: #d7ad58;
          --auth-canvas: #eef2f1;
          min-height: 100vh;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          overflow: hidden;
          background:
            radial-gradient(circle at 12% 15%, rgba(215, 173, 88, .16), transparent 28%),
            linear-gradient(135deg, #0d1d22 0%, var(--auth-dark) 48%, var(--auth-mid) 100%);
        }
        .auth-switch__container {
          position: relative;
          width: 100%;
          max-width: 960px;
          height: 610px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, .18);
          border-radius: 24px;
          background: #fff;
          box-shadow: 0 30px 80px rgba(3, 15, 19, .38);
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
        .auth-switch__brand-copy { color: var(--auth-dark); font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
        .auth-switch__title { margin: 0 0 6px; color: var(--auth-dark); font-size: 2rem; font-weight: 800; letter-spacing: -.035em; }
        .auth-switch__subtitle { margin: 0 0 16px; color: #68777c; font-size: .82rem; text-align: center; }
        .auth-switch__field {
          display: grid;
          grid-template-columns: 48px 1fr;
          align-items: center;
          width: 100%;
          height: 52px;
          margin: 7px 0;
          border: 1px solid transparent;
          border-radius: 14px;
          background: var(--auth-canvas);
          transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .auth-switch__field:focus-within {
          border-color: var(--auth-mid);
          background: #fff;
          box-shadow: 0 0 0 3px rgba(19, 38, 45, .1);
        }
        .auth-switch__field-icon { display: grid; place-items: center; color: #6c7b80; }
        .auth-switch__field input {
          width: 100%;
          height: 100%;
          padding: 0 14px 0 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #172127;
          font-size: .9rem;
          font-weight: 600;
        }
        .auth-switch__field input::placeholder { color: #8b989c; font-weight: 500; }
        .auth-switch__button {
          min-width: 154px;
          height: 48px;
          margin: 12px 0 0;
          padding: 0 24px;
          border: 0;
          border-radius: 999px;
          background: var(--auth-dark);
          color: #fff;
          font-size: .78rem;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          transition: transform .2s, background .2s, box-shadow .2s;
        }
        .auth-switch__button:hover:not(:disabled) { transform: translateY(-2px); background: var(--auth-mid); box-shadow: 0 8px 20px rgba(19, 38, 45, .24); }
        .auth-switch__button:disabled { cursor: not-allowed; opacity: .6; }
        .auth-switch__link { margin-top: 14px; color: #416773; font-size: .75rem; font-weight: 700; text-decoration: none; }
        .auth-switch__link:hover { text-decoration: underline; }
        .auth-switch__error { width: 100%; margin: 8px 0 0; color: #a93e38; font-size: .72rem; font-weight: 700; text-align: center; }
        .auth-switch__hint { margin: 8px 0 0; color: #7c898d; font-size: .68rem; }
        .auth-switch__divider { display: flex; align-items: center; width: 100%; gap: 10px; margin: 13px 0 5px; color: #849095; font-size: .65rem; font-weight: 700; text-transform: uppercase; }
        .auth-switch__divider::before, .auth-switch__divider::after { content: ""; flex: 1; height: 1px; background: #dbe2e1; }
        .auth-switch__socials { display: grid; grid-template-columns: repeat(2, 1fr); width: 100%; gap: 9px; }
        .auth-switch__social {
          display: flex; align-items: center; justify-content: center; gap: 8px; height: 42px;
          border: 1px solid #d8dfde; border-radius: 12px; background: #fff; color: #26383e;
          font-size: .72rem; font-weight: 800; text-decoration: none; transition: border-color .2s, box-shadow .2s, transform .2s;
        }
        .auth-switch__social:hover { transform: translateY(-1px); border-color: #9caaaa; box-shadow: 0 5px 14px rgba(19, 38, 45, .1); }
        .auth-switch__social svg { width: 17px; height: 17px; }
        .auth-switch__panels { z-index: 6; display: grid; grid-template-columns: repeat(2, 1fr); pointer-events: none; }
        .auth-switch__panel { display: flex; align-items: flex-end; justify-content: space-around; flex-direction: column; text-align: center; }
        .auth-switch__panel--left { padding: 3rem 17% 3rem 10%; pointer-events: auto; }
        .auth-switch__panel--right { padding: 3rem 10% 3rem 17%; }
        .auth-switch__panel-content { color: #fff; transition: transform .9s ease-in-out .6s; }
        .auth-switch__panel h2 { margin: 0 0 12px; font-size: 1.65rem; font-weight: 800; }
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
            radial-gradient(circle at 64% 68%, rgba(215, 173, 88, .2), transparent 18%),
            linear-gradient(-45deg, #0e2026 0%, var(--auth-dark) 55%, #214550 100%);
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
              <SocialLoginButtons />
              <div className="auth-switch__divider">or use email</div>
              <AuthField icon={<Mail size={19} />} label="Email address">
                <input name="email" type="email" placeholder="Email address" autoComplete="email" required />
              </AuthField>
              <AuthField icon={<LockKeyhole size={19} />} label="Password">
                <input name="password" type="password" placeholder="Password" autoComplete="current-password" required />
              </AuthField>
              {!isSignUp && (error || oauthError) && <p className="auth-switch__error" role="alert">{error || oauthError}</p>}
              <button className="auth-switch__button" disabled={saving}>
                {saving ? "Signing in…" : "Sign in"}
              </button>
              <Link className="auth-switch__link" to="/forgot-password">Forgot your password?</Link>
            </form>

            <form className="auth-switch__form auth-switch__form--signup" onSubmit={submitSignUp}>
              <Brand />
              <h1 className="auth-switch__title">Create account</h1>
              <p className="auth-switch__subtitle">Create your owner account and K9 workspace.</p>
              <SocialLoginButtons />
              <div className="auth-switch__divider">or use email</div>
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

function SocialLoginButtons() {
  return (
    <div className="auth-switch__socials" aria-label="Social login options">
      <a className="auth-switch__social" href="/api/auth/oauth/google">
        <GoogleIcon /> Google
      </a>
      <a className="auth-switch__social" href="/api/auth/oauth/facebook">
        <FacebookIcon /> Facebook
      </a>
    </div>
  )
}

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.25c0-.73-.07-1.43-.19-2.1H12v3.98h5.24a4.48 4.48 0 0 1-1.94 2.94v2.58h3.14c1.84-1.69 2.91-4.19 2.91-7.4Z"/><path fill="#34A853" d="M12 21.75c2.63 0 4.83-.87 6.44-2.36l-3.14-2.58c-.87.58-1.98.93-3.3.93-2.53 0-4.68-1.71-5.45-4.01H3.31v2.66A9.74 9.74 0 0 0 12 21.75Z"/><path fill="#FBBC05" d="M6.55 13.73A5.86 5.86 0 0 1 6.25 12c0-.6.1-1.18.3-1.73V7.61H3.31A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.06 4.39l3.24-2.66Z"/><path fill="#EA4335" d="M12 6.26c1.43 0 2.71.49 3.72 1.45l2.79-2.79A9.35 9.35 0 0 0 12 2.25a9.74 9.74 0 0 0-8.69 5.36l3.24 2.66c.77-2.3 2.92-4.01 5.45-4.01Z"/></svg>
}

function FacebookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.62.77-1.62 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z"/></svg>
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
