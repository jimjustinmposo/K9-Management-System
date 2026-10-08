import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { k9Api } from "../lib/k9Api";
import { useAuth } from "../lib/auth";
import { k9Initials, type K9Record } from "../types/k9";
import { SubscriptionStatusBar } from "../components/AppShell";

type IconName =
  | "alert"
  | "arrow"
  | "calendar"
  | "check"
  | "chevron"
  | "clipboard"
  | "clock"
  | "cross"
  | "dashboard"
  | "dog"
  | "task"
  | "download"
  | "heart"
  | "menu"
  | "more"
  | "plus"
  | "reports"
  | "search"
  | "shield"
  | "training"
  | "users";

function Icon({
  name,
  className = "size-5",
}: {
  name: IconName;
  className?: string;
}) {
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
    heart: (
      <path d="M20.8 5.7a5.4 5.4 0 0 0-7.6 0L12 6.9l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.7a5.4 5.4 0 0 0 0-7.6Z" />
    ),
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
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
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
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
    cross: <path d="m6 6 12 12M18 6 6 18" />,
    download: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

const navItems: {
  label: string;
  icon: IconName;
  to: string;
}[] = [
  { label: "Dashboard", icon: "dashboard", to: "/" },
  { label: "K9 Roster", icon: "dog", to: "/k9-roster" },
  { label: "Today's Task", icon: "task", to: "/todays-task" },
  { label: "Training", icon: "training", to: "/training" },
  { label: "Medical", icon: "heart", to: "/medical" },
  { label: "Deployments", icon: "clipboard", to: "/deployments" },
  { label: "Handlers", icon: "users", to: "/handlers" },
  { label: "Reports", icon: "reports", to: "/reports" },
  { label: "Subscription", icon: "shield", to: "/subscription" },
];

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface ${className}`}>
      {children}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "Active"
      ? "bg-positive-soft text-positive"
      : status === "In Training"
        ? "bg-info-soft text-info"
        : status === "Medical Hold"
          ? "bg-warning-soft text-warning"
          : status === "Retired"
            ? "bg-violet-soft text-violet"
            : status === "Deceased"
              ? "bg-danger-soft text-danger"
              : "bg-canvas text-muted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${style}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status || "Unset"}
    </span>
  );
}

const TONE_CLASSES = ["bg-k9-one", "bg-k9-two", "bg-k9-three", "bg-k9-four"];

function toneFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TONE_CLASSES[hash % TONE_CLASSES.length] ?? "bg-k9-one";
}

function PanelHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">
            {eyebrow}
          </p>
        )}
        <h2 className="text-base font-extrabold tracking-tight text-ink">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export default function DashboardPage() {
  const { session, logout } = useAuth();
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [alerts] = useState<{ id: number }[]>([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [roster, setRoster] = useState<K9Record[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setRosterLoading(true);
    k9Api
      .list()
      .then((rows) => {
        if (active) setRoster(rows);
      })
      .catch(() => {
        if (active) setRoster([]);
      })
      .finally(() => {
        if (active) setRosterLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totalK9s = roster.length;
  const deployableK9s = roster.filter((k9) => k9.status === "Active").length;
  const totalLabel = rosterLoading ? "â€¦" : String(totalK9s);
  const deployableLabel = rosterLoading
    ? "Loading rosterâ€¦"
    : `${deployableK9s} currently deployable`;
  const filteredRoster = roster.slice(0, 4);

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      {mobileNav && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-navy/60 lg:hidden"
          onClick={() => setMobileNav(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy text-white transition-transform duration-300 lg:translate-x-0 ${
          mobileNav ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
              <Icon name="shield" className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
                Sentinel
              </p>
              <p className="text-sm font-extrabold tracking-wide text-white">
                K9 OPERATIONS
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
            className="text-white/60 lg:hidden"
          >
            <Icon name="cross" />
          </button>
        </div>

        <div className="px-4 pt-4">
          <SubscriptionStatusBar />
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label="Main navigation">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
            Operations
          </p>
          <div className="mt-3 space-y-1">
            {navItems.filter((item) => item.label !== "Subscription" || session?.role === "owner").map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => {
                  setActiveNav(item.label);
                  setMobileNav(false);
                }}
                title={item.label}
                className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  activeNav === item.label
                    ? "bg-gold text-navy shadow-nav"
                    : "text-white/60 hover:bg-white/6 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon name={item.icon} className="size-[18px]" />
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-slate text-xs font-extrabold">{session?.user.name.split(/\s+/).map((part) => part[0]).join("").slice(0,2).toUpperCase()}</div>
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
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
              className="grid size-10 place-items-center rounded-lg border border-line text-muted lg:hidden"
            >
              <Icon name="menu" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                Wednesday Â· May 14, 2025
              </p>
              <h1 className="mt-0.5 text-xl font-extrabold tracking-tight md:text-2xl">
                {activeNav}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`hidden items-center overflow-hidden rounded-lg border border-line bg-canvas transition-all sm:flex ${
                searchOpen ? "w-64" : "w-10"
              }`}
            >
              <button
                type="button"
                aria-label="Search"
                onClick={() => setSearchOpen((open) => !open)}
                className="grid size-10 shrink-0 place-items-center text-muted"
              >
                <Icon name="search" className="size-4" />
              </button>
              {searchOpen && (
                <input
                  autoFocus
                  aria-label="Search K9 records"
                  placeholder="Search K9s, handlers..."
                  className="w-full bg-transparent pr-3 text-xs font-medium outline-none placeholder:text-muted/70"
                />
              )}
            </div>
            <button
              type="button"
              className="relative grid size-10 place-items-center rounded-lg border border-line bg-surface text-muted hover:bg-canvas"
              aria-label={`${alerts.length} notifications`}
            >
              <Icon name="alert" className="size-[18px]" />
              {alerts.length > 0 && (
                <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-surface bg-danger" />
              )}
            </button>
          </div>
        </header>

        <main className="p-4 md:p-7 lg:p-8">
          <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="size-2 rounded-full bg-positive shadow-status" />
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-positive">
                  Unit operational
                </p>
              </div>
              <h2 className="text-2xl font-black tracking-tight md:text-3xl">
                Good morning, Commander.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Your unit is at <strong className="text-ink">89% readiness</strong>.
                Two records require attention before the next deployment window.
              </p>
            </div>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(
              [
                {
                  label: "Total K9s",
                  value: totalLabel,
                  note: deployableLabel,
                  blank: false,
                  icon: "dog" as IconName,
                  color: "text-info bg-info-soft",
                },
                {
                  label: "Unit readiness",
                  value: "",
                  note: "",
                  blank: true,
                  icon: "shield" as IconName,
                  color: "text-positive bg-positive-soft",
                },
                {
                  label: "Training this month",
                  value: "",
                  note: "",
                  blank: true,
                  icon: "training" as IconName,
                  color: "text-violet bg-violet-soft",
                },
                {
                  label: "Open actions",
                  value: "",
                  note: "",
                  blank: true,
                  icon: "alert" as IconName,
                  color: "text-warning bg-warning-soft",
                },
              ] as {
                label: string;
                value: string;
                note: string;
                blank?: boolean;
                icon: IconName;
                color: string;
              }[]
            ).map((stat) => (
              <Panel key={stat.label} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">
                      {stat.blank ? "\u00A0" : stat.label}
                    </p>
                    <p className="mt-2 min-h-[36px] text-3xl font-black tracking-tight">
                      {stat.blank ? "" : stat.value}
                    </p>
                  </div>
                  <div
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${stat.color}`}
                  >
                    <Icon name={stat.icon} className="size-5" />
                  </div>
                </div>
                <div className="mt-4 flex min-h-[29px] items-center gap-2 border-t border-line pt-3">
                  {stat.blank ? null : (
                    <>
                      <span className="size-1.5 rounded-full bg-line-strong" />
                      <p className="text-[11px] font-semibold text-muted">
                        {stat.note}
                      </p>
                    </>
                  )}
                </div>
              </Panel>
            ))}
          </section>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.8fr)]">
            <Panel className="overflow-hidden">
              <PanelHeader
                eyebrow="Live status"
                title="K9 readiness roster"
                action={
                  <Link
                    to="/k9-roster"
                    className="rounded-lg bg-navy px-3 py-1.5 text-[10px] font-extrabold text-white transition hover:bg-navy-light"
                  >
                    Open K9 Roster
                  </Link>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left">
                  <thead>
                    <tr className="bg-canvas/70 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
                      <th className="px-5 py-3">K9 team</th>
                      <th className="px-4 py-3">Specialty</th>
                      <th className="px-4 py-3">Readiness</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="w-12 px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoster.map((k9) => (
                      <tr
                        key={k9.id}
                        className="group border-t border-line transition hover:bg-canvas/60"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`relative grid size-10 place-items-center overflow-hidden rounded-xl text-xs font-black text-white ${toneFor(k9.id)}`}
                            >
                              <Icon
                                name="dog"
                                className="absolute size-14 translate-x-3 translate-y-3 opacity-15"
                              />
                              {k9Initials(k9.dogName)}
                            </div>
                            <div>
                              <p className="text-sm font-extrabold">
                                {k9.dogName || "Unnamed K9"}{" "}
                                <span className="ml-1 text-[10px] font-bold text-muted">
                                  {k9.microchipNumber ? `#${k9.microchipNumber.slice(-4)}` : "No chip"}
                                </span>
                              </p>
                              <p className="mt-0.5 text-[10px] font-medium text-muted">
                                {k9.breed || "Breed unset"}{k9.sex ? ` Â· ${k9.sex}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate">
                          {k9.nickName ? `"${k9.nickName}"` : "â€”"}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-line">
                              <div
                                className={`h-full rounded-full ${
                                  k9.status === "Active"
                                    ? "bg-positive"
                                    : k9.status === "In Training"
                                      ? "bg-info"
                                      : "bg-warning"
                                } ${
                                  k9.status === "Active"
                                    ? "w-full"
                                    : k9.status === "In Training"
                                      ? "w-3/4"
                                      : "w-1/4"
                                }`}
                              />
                            </div>
                            <span className="text-xs font-extrabold">
                              {k9.status || "Unset"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={k9.status} />
                        </td>
                        <td className="px-3 py-3.5">
                          <Link
                            to={session?.permissions.edit ? `/k9-roster/${k9.id}/edit` : "/k9-roster"}
                            aria-label={`View ${k9.dogName || "K9 record"}`}
                            className="grid size-8 place-items-center rounded-lg text-muted opacity-50 transition group-hover:bg-white group-hover:opacity-100"
                          >
                            <Icon name="chevron" className="size-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rosterLoading && (
                  <p className="px-5 py-12 text-center text-sm text-muted">
                    Loading live rosterâ€¦
                  </p>
                )}
                {!rosterLoading && filteredRoster.length === 0 && (
                  <p className="px-5 py-12 text-center text-sm text-muted">
                    No K9 records yet.
                    {session?.permissions.create && (
                      <>
                        {" "}
                        <Link to="/k9-roster/new" className="font-extrabold text-info">
                          Add the first record
                        </Link>
                        .
                      </>
                    )}
                  </p>
                )}
              </div>
              <Link
                to="/k9-roster"
                className="flex w-full items-center justify-center gap-2 border-t border-line py-3 text-[11px] font-extrabold text-slate transition hover:bg-canvas"
              >
                View full roster
                <Icon name="arrow" className="size-3.5" />
              </Link>
            </Panel>

            <Panel className="overflow-hidden">
              <PanelHeader
                eyebrow=" "
                title=" "
              />
              <div className="min-h-[280px] px-5 py-2" />
            </Panel>
          </div>

          <div className="mt-5 grid gap-5">
            <Panel className="overflow-hidden">
              <PanelHeader
                eyebrow=" "
                title=" "
              />
              <div className="min-h-[180px]" />
            </Panel>
          </div>

          <div className="mt-5 grid gap-5">
            <Panel className="overflow-hidden">
              <PanelHeader
                eyebrow=" "
                title=" "
              />
              <div className="min-h-[120px] p-5" />
            </Panel>
          </div>

          <footer className="mt-7 flex flex-col gap-2 border-t border-line pt-5 text-[10px] font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>Sentinel K9 Operations Â· Secure command environment</p>
            <p>Last synchronized today at 07:42 AM</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
