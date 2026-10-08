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
        <Link to="/" className="mb-7 flex items-center justify-center gap-3">
          <img
            src="/logo.png"
            alt="Mussafah K9 Operation logo"
            className="size-16 shrink-0 rounded-xl bg-white p-1 object-contain shadow-sm ring-1 ring-black/5 sm:size-[4.5rem]"
          />
          <span>
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.2em] text-gold">
              MUSSAFAH
            </span>
            <span className="block text-sm font-black tracking-wide text-navy">
              K9 OPERATION
            </span>
          </span>
        </Link>
        <section className="rounded-2xl border border-line bg-surface p-7 shadow-[0_20px_60px_rgba(19,38,45,.08)]">
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
          {children}
        </section>
      </div>
    </main>
  )
}

export const authInput =
  "mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3 text-sm font-semibold outline-none focus:border-navy"
export const primaryButton =
  "w-full rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white shadow-action transition hover:bg-navy-light disabled:cursor-not-allowed disabled:opacity-60"
