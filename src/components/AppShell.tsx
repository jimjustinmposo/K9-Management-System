import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";
import ThemeToggle from "./ThemeToggle";

export type IconName =
  | "dog"
  | "dashboard"
  | "boarding"
  | "feeding"
  | "inventory"
  | "shopping"
  | "season"
  | "weight"
  | "task"
  | "training"
  | "grooming"
  | "car"
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
  | "more"
  | "logout";

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="5" rx="1" /><rect x="13" y="10" width="8" height="11" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /></>,
    dog: (
      <>
        <path d="M7 9.5 4 7V4l5 2h6l5-2v3l-3 2.5V15a5 5 0 0 1-10 0Z" />
        <path d="M9.5 13h.01M14.5 13h.01M10 17h4M12 15v2" />
      </>
    ),
    boarding: (
      <>
        <path d="M3 11 12 4l9 7" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    feeding: (
      <>
        <path d="M4 7h16M6 7c0 8 2 12 6 12s6-4 6-12" />
        <path d="M8 4h8M9 11h6" />
      </>
    ),
    inventory: (
      <>
        <path d="M4 7 12 3l8 4v10l-8 4-8-4Z" />
        <path d="m4 7 8 4 8-4M12 11v10M8 5l8 4" />
      </>
    ),
    shopping: (
      <>
        <path d="M3 4h2l2.5 12h11l2-8H6" />
        <circle cx="9" cy="20" r="1" /><circle cx="17" cy="20" r="1" />
      </>
    ),
    season: <><path d="M12 3v18M3 12h18" /><path d="M12 3c-3 2-5 5-5 9s2 7 5 9M12 3c3 2 5 5 5 9s-2 7-5 9" /></>,
    weight: (
      <>
        <path d="M12 3v3M7 6h10l2 14H5L7 6Z" />
        <path d="M9 10h6M10 14h4" />
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
    grooming: <><path d="M12 3c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11Z" /><path d="M9 15a3 3 0 0 0 3 3" /></>,
    car: <><path d="m5 11 1.5-5h11L19 11" /><path d="M3 11h18v8H3z" /><circle cx="7" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /><path d="M5 14h2M17 14h2" /></>,
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
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </>
    ),
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
  return <section className={`app-panel rounded-xl border border-line bg-surface shadow-filter ${className}`}>{children}</section>;
}

export function PanelHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{eyebrow}</p>
        <h2 className="font-sans text-base font-semibold tracking-tight text-ink">{title}</h2>
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
    <div className={`inline-flex min-h-9 max-w-full items-center gap-2 rounded-md border px-3 py-1.5 text-left ${
      active
        ? "border-positive/20 bg-positive-soft/70 text-positive"
        : "border-warning/25 bg-warning-soft/70 text-warning"
    }`}>
      <span className={`size-1.5 shrink-0 rounded-full ${active ? "bg-positive" : "bg-warning"}`} />
      <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]">{active ? "Full access" : "View-only access"}</span>
      {active && renewal && <span className="hidden border-l border-positive/20 pl-2 text-[10px] font-semibold sm:inline">Renews {renewal}</span>}
    </div>
  );
}

const navItems: { label: string; to: string; icon: IconName }[] = [
  { label: "Operations Dashboard", to: "/dashboard", icon: "dashboard" },
  { label: "K9 Roster", to: "/k9-roster", icon: "dog" },
  { label: "Boarding", to: "/boarding", icon: "boarding" },
  { label: "In Season", to: "/in-season", icon: "season" },
  { label: "K9 Feeding", to: "/feeding", icon: "feeding" },
  { label: "Food Inventory", to: "/food-inventory", icon: "inventory" },
  { label: "Shopping", to: "/shopping", icon: "shopping" },
  { label: "K9 Weights", to: "/weights", icon: "weight" },
  { label: "Training", to: "/training", icon: "training" },
  { label: "Grooming", to: "/grooming", icon: "grooming" },
  { label: "Car Usage", to: "/car-usage", icon: "car" },
  { label: "Medical", to: "/medical", icon: "heart" },
  { label: "Handlers", to: "/handlers", icon: "users" },
  { label: "Reports", to: "/reports", icon: "reports" },
  { label: "Users", to: "/users", icon: "users" },
  { label: "Subscription", to: "/subscription", icon: "shield" },
];

let navigationScrollTop = 0;

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const navigationRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (navigationRef.current) navigationRef.current.scrollTop = navigationScrollTop;
  }, []);
  const [mobileNav, setMobileNav] = useState(false);
  const { session, logout } = useAuth();
  const visibleNav = navItems.filter((item) => {
    if (item.to === "/users") return session?.permissions.viewAdmin;
    if (item.to === "/reports" || item.to === "/subscription")
      return session?.role === "owner";
    return true;
  });
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3 focus:text-ink">Skip to content</a>
      {mobileNav && (
        <button type="button" aria-label="Close menu"
          className="fixed inset-0 z-30 bg-navy/60 lg:hidden" onClick={() => setMobileNav(false)} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto bg-navy text-white transition-transform duration-300 lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
          <Link to="/k9-roster" className="flex items-center gap-3">
            <div className="grid size-9 place-items-center overflow-hidden rounded-lg border border-gold/40 bg-white/5">
              <img src="/logo.jpg" alt="" className="size-full object-cover" />
            </div>
            <div>
              <img src="/Caninelogy.png" alt="Caninelogy" className="h-10 max-w-36 object-contain object-left" />
            </div>
          </Link>
          <button type="button" aria-label="Close navigation" onClick={() => setMobileNav(false)} className="text-white/60 lg:hidden">
            <Icon name="cross" />
          </button>
        </div>
        <nav ref={navigationRef} onScroll={(event) => { navigationScrollTop = event.currentTarget.scrollTop; }} className="min-h-0 flex-1 overflow-y-auto px-4 py-5" aria-label="Main navigation">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Operations</p>
          <div className="mt-3 space-y-1">
            {visibleNav.map((item) => (
              <NavLink key={item.label} to={item.to} end={item.to === "/"}
                onClick={() => setMobileNav(false)}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                    isActive ? "bg-gold/15 text-gold shadow-nav ring-1 ring-inset ring-gold/25" : "text-white/65 hover:bg-white/6 hover:text-white"
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
              <button
                type="button"
                onClick={() => void logout()}
                title="Log out"
                aria-label="Log out"
                className="flex min-h-9 w-full items-center justify-center gap-2 rounded-full border border-transparent bg-gold px-3 py-2 text-xs font-medium uppercase tracking-[0.04em] text-navy shadow-action transition hover:bg-gold/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              >
                <Icon name="logout" className="size-[18px]" />
                <span>Log out</span>
              </button>
          </div>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur md:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" aria-label="Open navigation" onClick={() => setMobileNav(true)}
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-muted transition hover:border-positive hover:bg-positive-soft hover:text-positive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-positive lg:hidden">
              <Icon name="menu" />
            </button>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">K9 Management System</p>
              <h1 className="mt-0.5 text-[22px] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="hidden max-w-40 text-right sm:block">
              <p className="truncate text-[13px] font-medium text-ink">{session?.user.name}</p>
              <p className="text-xs capitalize text-muted">{session?.role}</p>
            </div>
            <div className="hidden size-9 shrink-0 place-items-center rounded-full border border-olive/40 bg-olive/15 font-mono text-xs font-semibold text-olive sm:grid" aria-hidden="true">
              {session?.user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block"><SubscriptionStatusBar /></div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="min-w-0 p-4 md:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}


