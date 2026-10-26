import { Link } from "react-router-dom"
import type { ReactNode } from "react"
import ThemeToggle from "./ThemeToggle"

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
    <main className="relative grid min-h-screen place-items-center bg-canvas p-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-md">
        <Link to="/" className="mb-7 flex items-center justify-center gap-2.5">
          <img
            src="/logo.jpg"
            alt=""
            className="size-[46px] shrink-0 rounded-xl bg-white p-[3px] object-contain shadow-sm"
          />
          <img
            src="/Caninelogy.png"
            alt="Caninelogy"
            className="h-auto min-w-0 max-w-[calc(100%-56px)] object-contain"
          />
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
  "button-primary w-full"
