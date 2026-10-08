import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";

export type IconName =
  | "dashboard"
  | "dog"
  | "task"
  | "training"
  | "heart"
  | "shield"
  | "clipboard"
  | "users"
  | "reports"
  | "search"
  | "alert"
  | "plus"
  | "chevron"
  | "cross"
  | "menu"
  | "more";

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    dog: (
      <>
        <path d="M7 9.5 4 7V4l5 2h6l5-2v3l-3 2.5V15a5 5 0 0 1-10 0Z" />
        <path d="M9.5 13h.01M14.5 13h.01M10 17h4M12 15v2" />
      </>
    ),
    task: (
      <>
        <rect x="4" y="4" width="16" height="18" rx="2" />
        <path d="M9 4V2h6v2M8 11l2 2 4-4M8 17h8" />
      </>
    ),
    training: (
      <>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />
        <path d="M2 19h22" />
      </>
    ),
    heart: <path d="M20.8 5.7a5.4 5.4 0 0 0-7.6 0L12 6.9l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.7a5.4 5.4 0 0 0 0-7.6Z" />,
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    clipboard: (
      <>
        <rect x="4" y="4" width="16" height="18" rx="2" />
        <path d="M9 4V2h6v2M8 10h8M8 15h5" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0M16 4.6a4 4 0 0 1 0 6.8M18 14a7 7 0 0 1 4 7" />
      </>
    ),
    reports: (
      <>
        <path d="M4 22V2h11l5 5v15Z" />
        <path d="M14 2v6h6M8 17v-4M12 17V9M16 17v-2" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    alert: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    cross: <path d="m6 6 12 12M18 6 6 18" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  };
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</section>;
}

export function PanelHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        {eyebrow && <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">{eyebrow}</p>}
        <h2 className="text-base font-extrabold tracking-tight text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function SubscriptionStatusBar() {
  const { session } = useAuth();
  if (!session) return null;
  const active = session.subscription.status.toLowerCase() === "active" && session.subscription.writable;
  const renewal = session.subscription.currentPeriodEnd
    ? new Date(session.subscription.currentPeriodEnd).toLocaleDateString("en-AE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b px-4 py-2 text-center text-[11px] font-bold ${
      active
        ? "border-positive/20 bg-positive-soft text-positive"
        : "border-warning/20 bg-warning-soft text-warning"
    }`}>
      <span className={`size-2 rounded-full ${active ? "bg-positive" : "bg-warning"}`} />
      <span>{active ? "Subscription active" : "Subscription inactive · View only"}</span>
      {active && renewal && <span className="font-semibold">Renews {renewal}</span>}
    </div>
  );
}

const navItems: { label: string; to: string; icon: IconName }[] = [
  { label: "Dashboard", to: "/", icon: "dashboard" },
  { label: "K9 Roster", to: "/k9-roster", icon: "dog" },
  { label: "Today's Task", to: "/todays-task", icon: "task" },
  { label: "Training", to: "/training", icon: "training" },
  { label: "Medical", to: "/medical", icon: "heart" },
  { label: "Deployments", to: "/deployments", icon: "clipboard" },
  { label: "Handlers", to: "/handlers", icon: "users" },
  { label: "Reports", to: "/reports", icon: "reports" },
];

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const [mobileNav, setMobileNav] = useState(false);
  const { session, logout } = useAuth();
  const visibleNav = navItems;
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      {mobileNav && (
        <button type="button" aria-label="Close menu"
          className="fixed inset-0 z-30 bg-navy/60 lg:hidden" onClick={() => setMobileNav(false)} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy text-white transition-transform duration-300 lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
              <Icon name="shield" className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Sentinel</p>
              <p className="text-sm font-extrabold tracking-wide text-white">K9 OPERATIONS</p>
            </div>
          </Link>
          <button type="button" aria-label="Close navigation" onClick={() => setMobileNav(false)} className="text-white/60 lg:hidden">
            <Icon name="cross" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label="Main navigation">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Operations</p>
          <div className="mt-3 space-y-1">
            {visibleNav.map((item) => (
              <NavLink key={item.label} to={item.to} end={item.to === "/"}
                onClick={() => setMobileNav(false)}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    isActive ? "bg-gold text-navy shadow-nav" : "text-white/60 hover:bg-white/6 hover:text-white"
                  }`
                }>
                <Icon name={item.icon} className="size-[18px]" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-slate text-xs font-extrabold">{session?.user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">{session?.user.name}</p>
                <p className="truncate text-[10px] capitalize text-white/45">{session?.role}</p>
              </div>
              <button type="button" onClick={() => void logout()} title="Sign out" className="text-white/40 hover:text-white"><Icon name="cross" className="size-4" /></button>
            </div>
          </div>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur md:px-7 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Open navigation" onClick={() => setMobileNav(true)}
              className="grid size-10 place-items-center rounded-lg border border-line text-muted lg:hidden">
              <Icon name="menu" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Sentinel K9 Operations</p>
              <h1 className="mt-0.5 text-xl font-extrabold tracking-tight md:text-2xl">{title}</h1>
            </div>
          </div>
        </header>
        <SubscriptionStatusBar />
        <main className="p-4 md:p-7 lg:p-8">{children}</main>
      </div>
    </div>
  );
}


