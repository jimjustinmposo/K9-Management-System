import { Link } from "react-router-dom"
import type { ReactNode } from "react"

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-7 flex items-center justify-center gap-4">
          <img
            src="/logo.png"
            alt="K9 Management System logo"
            className="size-16 shrink-0 rounded-xl bg-white p-1 object-contain shadow-sm ring-1 ring-white/10 sm:size-[4.5rem]"
          />
          <span>
            <span className="block text-xs font-extrabold uppercase tracking-[0.18em] text-gold sm:text-sm">
              K9 MANAGEMENT
            </span>
            <span className="block text-lg font-black tracking-wide text-ink sm:text-xl">
              SYSTEM
            </span>
          </span>
        </Link>
        <section className="rounded-2xl border border-line bg-surface p-7 shadow-action">
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
          {children}
        </section>
      </div>
    </main>
  )
}

export const authInput =
  "mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3 text-sm font-medium text-ink outline-none placeholder:text-muted/70 focus:border-gold"
export const primaryButton =
  "w-full rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white shadow-action transition hover:bg-navy-light disabled:cursor-not-allowed disabled:opacity-60"
