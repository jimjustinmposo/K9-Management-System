import { useMemo } from "react"
import { useCachedResource } from "../lib/useCachedResource"
import { Link } from "react-router-dom"
import { AppShell, Icon, Panel, PanelHeader } from "../components/AppShell"
import { boardingApi } from "../lib/boardingApi"
import { carUsageApi } from "../lib/carUsageApi"
import { foodInventoryApi } from "../lib/foodInventoryApi"
import { groomingApi } from "../lib/groomingApi"
import { inSeasonApi } from "../lib/inSeasonApi"
import { k9Api } from "../lib/k9Api"
import { medicalApi } from "../lib/medicalApi"
import { trainingApi } from "../lib/trainingApi"
import { useAuth } from "../lib/auth"
import { TRAINING_DISCIPLINES } from "../types/training"
import type { K9Record } from "../types/k9"
import type { BoardingRecord } from "../types/boarding"
import type { MedicalCondition, MedicalRecord } from "../types/medical"
import type { SeasonRecord } from "../types/inSeason"

type DashboardData = {
  k9s: K9Record[]
  boarding: BoardingRecord[]
  seasons: SeasonRecord[]
  conditions: MedicalCondition[]
  treatments: MedicalRecord[]
  inventory: Awaited<ReturnType<typeof foodInventoryApi.list>>
  trainingCounts: Record<string, number>
  trainingRecent: { date: string; dog: string; discipline: string; href: string }[]
  groomingRecent: Awaited<ReturnType<typeof groomingApi.list>>["data"]
  vehicleRecent: Awaited<ReturnType<typeof carUsageApi.list>>["data"]
}

type DashboardResult = { data: DashboardData; errors: string[] }

const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
const formatDate = (value: string) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"

async function loadDashboard(): Promise<DashboardResult> {
  const errors: string[] = []
  const safe = async <T,>(label: string, request: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await request() } catch { errors.push(label); return fallback }
  }
  const disciplines = TRAINING_DISCIPLINES
  const results = await Promise.all([
    safe("K9 roster", () => k9Api.list(), [] as K9Record[]),
    safe("boarding", () => boardingApi.list(), [] as BoardingRecord[]),
    safe("in-season records", async () => (await inSeasonApi.list({ limit: 200 })).data, [] as SeasonRecord[]),
    safe("medical conditions", () => medicalApi.conditions.list(), [] as MedicalCondition[]),
    safe("medical treatments", () => medicalApi.records.list(), [] as MedicalRecord[]),
    safe("food inventory", () => foodInventoryApi.list(), [] as Awaited<ReturnType<typeof foodInventoryApi.list>>),
    Promise.all(disciplines.map(async ({ id }) => {
      try { return [id, await trainingApi.count(id), (await trainingApi.page(id, "", 5, 0)).data] as const }
      catch { errors.push(`training ${id}`); return [id, 0, []] as const }
    })),
    safe("grooming", async () => (await groomingApi.list({ limit: 5, offset: 0 })).data, [] as Awaited<ReturnType<typeof groomingApi.list>>["data"]),
    safe("vehicle activity", async () => (await carUsageApi.list({ limit: 5, offset: 0 })).data, [] as Awaited<ReturnType<typeof carUsageApi.list>>["data"]),
  ])
  const training = results[6]
  return { data: {
    k9s: results[0], boarding: results[1], seasons: results[2], conditions: results[3], treatments: results[4], inventory: results[5],
    trainingCounts: Object.fromEntries(training.map(([id, count]) => [id, count])),
    trainingRecent: training.flatMap(([id, , rows]) => rows.map((row) => ({ date: row.session_date, dog: row.dog_name, discipline: disciplines.find((item) => item.id === id)?.name ?? id, href: `/training/${id}` }))),
    groomingRecent: results[7], vehicleRecent: results[8],
  }, errors }
}

function StatCard({ title, value, caption, icon, href, accent = "text-positive" }: { title: string; value: number | string; caption: string; icon: "dog" | "boarding" | "heart" | "season" | "inventory"; href: string; accent?: string }) {
  return <Link to={href} className="group rounded-xl border border-line bg-surface p-4 shadow-filter transition hover:-translate-y-0.5 hover:border-positive/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">{title}</span><Icon name={icon} className={`size-4 ${accent}`} /></div><p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-ink">{value}</p><p className="mt-1 text-xs text-muted group-hover:text-ink">{caption} <span aria-hidden="true">↗</span></p></Link>
}

function TrainingBars({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(counts))
  return <div className="space-y-3 p-4">{TRAINING_DISCIPLINES.map(({ id, name }) => <Link key={id} to={`/training/${id}`} className="group grid grid-cols-[minmax(100px,1fr)_2fr_2rem] items-center gap-3 text-xs"><span className="truncate text-muted group-hover:text-ink">{name.replace("K9 ", "")}</span><span className="h-2 overflow-hidden rounded-full bg-canvas"><span className="block h-full rounded-full bg-positive transition-[width]" style={{ width: `${Math.max(counts[id] ? 4 : 0, counts[id] / max * 100)}%` }} /></span><span className="text-right font-mono text-ink">{counts[id] ?? 0}</span></Link>)}</div>
}

export default function DashboardPage() {
  const { session } = useAuth()
  const { data: result, loading, error, refresh } = useCachedResource("/api/dashboard/view", loadDashboard)
  const data = result?.data
  const today = localDate()
  const alerts = useMemo(() => {
    if (!data) return [] as { id: string; title: string; detail: string; href: string; severity: "danger" | "warning" }[]
    const items: { id: string; title: string; detail: string; href: string; severity: "danger" | "warning" }[] = []
    data.boarding.filter((row) => row.status === "Boarding" && row.checkOutDate && row.checkOutDate < today).forEach((row) => items.push({ id: `boarding:${row.id}`, title: `${row.k9.dogName} — overdue checkout`, detail: `Expected ${formatDate(row.checkOutDate)}`, href: "/boarding?status=Boarding&overdue=1", severity: "danger" }))
    data.k9s.filter((row) => row.status === "Medical Hold").forEach((row) => items.push({ id: `hold:${row.id}`, title: `${row.dogName} — medical hold`, detail: "Review current operational status", href: "/k9-roster?status=Medical%20Hold", severity: "warning" }))
    data.conditions.filter((row) => row.severity === "Critical" || row.severity === "High").forEach((row) => items.push({ id: `condition:${row.id}`, title: `${row.dog_name} — ${row.condition_name}`, detail: `${row.severity} severity · diagnosed ${formatDate(row.diagnosis_date)}`, href: "/medical/conditions", severity: row.severity === "Critical" ? "danger" : "warning" }))
    data.treatments.filter((row) => row.end_date && row.end_date < today).forEach((row) => items.push({ id: `treatment:${row.id}`, title: `${row.dog_name} — treatment date passed`, detail: `${row.medication_name} · ended ${formatDate(row.end_date)}`, href: "/medical/records", severity: "warning" }))
    data.inventory.filter((row) => row.remaining < 5).forEach((row) => {
      const depleted = row.remaining <= 0
      items.push({
        id: `stock:${row.id}`,
        title: `${row.item} — ${depleted ? "out of stock" : "about to run out"}`,
        detail: `${row.brand || "Food inventory"} · ${row.remaining} kg remaining (below 5 kg)`,
        href: "/food-inventory?stock=low",
        severity: depleted ? "danger" : "warning",
      })
    })
    return items.sort((a, b) => (a.severity === "danger" ? 0 : 1) - (b.severity === "danger" ? 0 : 1) || a.title.localeCompare(b.title))
  }, [data, today])

  const upcoming = useMemo(() => {
    if (!data) return [] as { id: string; date: string; title: string; detail: string; href: string }[]
    const end = new Date(`${today}T00:00:00`); end.setDate(end.getDate() + 7)
    const endDay = localDate(end)
    const rows: { id: string; date: string; title: string; detail: string; href: string }[] = []
    data.boarding.filter((row) => row.status === "Boarding" && row.checkOutDate >= today && row.checkOutDate <= endDay).forEach((row) => rows.push({ id: `checkout:${row.id}`, date: row.checkOutDate, title: `${row.k9.dogName} checkout`, detail: "Boarding stay", href: "/boarding?status=Boarding" }))
    data.boarding.filter((row) => row.status === "Checked Out" && row.checkInDate >= today && row.checkInDate <= endDay).forEach((row) => rows.push({ id: `checkin:${row.id}`, date: row.checkInDate, title: `${row.k9.dogName} check-in`, detail: "Scheduled boarding", href: "/boarding" }))
    data.seasons.filter((row) => row.status === "Active").flatMap((row) => getUpcomingSeasonItems(row, today)).forEach((item) => rows.push(item))
    return rows.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8)
  }, [data, today])

  const recent = useMemo(() => {
    if (!data) return [] as { id: string; date: string; title: string; category: string; href: string }[]
    const rows = [
      ...data.trainingRecent.map((row, index) => ({ id: `training:${row.href}:${row.date}:${row.dog}:${index}`, date: row.date, title: `${row.dog} · training`, category: row.discipline, href: row.href })),
      ...data.groomingRecent.map((row) => ({ id: `grooming:${row.id}`, date: row.date, title: `${row.dogName} · grooming`, category: "Care", href: "/grooming" })),
      ...data.vehicleRecent.map((row) => ({ id: `vehicle:${row.id}`, date: row.date, title: `${row.driver} · vehicle activity`, category: row.driver, href: "/car-usage" })),
    ]
    return rows.filter((row) => row.date <= today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)
  }, [data, today])

  const rosterStatuses = useMemo(() => {
    const counts = new Map<string, number>()
    data?.k9s.forEach((dog) => counts.set(dog.status || "Unset", (counts.get(dog.status || "Unset") ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [data])
  const activeSeasons = data?.seasons.filter((row) => row.status === "Active").length ?? 0
  const occupied = data?.boarding.filter((row) => row.status === "Boarding").length ?? 0
  const lowStock = data?.inventory.filter((row) => row.remaining < 5).length ?? 0

  return <AppShell title="Operations Dashboard">
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-positive">Command view · {session?.workspace.name}</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Operational readiness</h2><p className="mt-1 text-sm text-muted">A current overview of your K9 roster, care, and daily activity.</p></div><div className="flex items-center gap-3"><span className="text-xs text-muted">Updated {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><button type="button" onClick={refresh} className="button-secondary min-h-9 px-3 py-1.5 text-xs">Refresh</button></div></div>
      {error && <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">Dashboard could not load: {error}</div>}
      {result?.errors.length ? <div role="status" className="rounded-lg border border-warning/30 bg-warning-soft/50 px-4 py-2.5 text-xs text-warning">Some modules could not be refreshed: {[...new Set(result.errors)].join(", ")}. Their counts are omitted or shown as zero; retry when connected.</div> : null}
      {loading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl border border-line bg-surface" />)}</div> : data && <>
        <section aria-label="Operational summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="K9 Roster" value={data.k9s.length} caption={`${data.k9s.filter((dog) => dog.status === "Active").length} active · ${data.k9s.filter((dog) => dog.status === "In Training").length} in training`} icon="dog" href="/k9-roster" />
          <StatCard title="Boarding now" value={occupied} caption="Currently marked boarding" icon="boarding" href="/boarding?status=Boarding" accent="text-info" />
          <StatCard title="Open alerts" value={alerts.length} caption={`${alerts.filter((item) => item.severity === "danger").length} urgent · ${alerts.filter((item) => item.severity === "warning").length} review`} icon="heart" href="/medical" accent={alerts.length ? "text-warning" : "text-positive"} />
          <StatCard title="Active seasons" value={activeSeasons} caption="Currently tracked cycles" icon="season" href="/in-season?status=Active" accent="text-violet" />
          <StatCard title="Low food stock" value={lowStock} caption="Below 5 kg remaining" icon="inventory" href="/food-inventory?stock=low" accent={lowStock ? "text-warning" : "text-positive"} />
        </section>
        <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <Panel><PanelHeader eyebrow="Priority queue" title={`Alerts & items requiring attention · ${alerts.length}`} action={<Link to="/medical" className="text-xs font-semibold text-positive hover:underline">Medical overview ↗</Link>} />
            {alerts.length ? <div className="divide-y divide-line">{alerts.slice(0, 8).map((alert) => <Link key={alert.id} to={alert.href} className="flex items-center gap-3 px-5 py-3 transition hover:bg-canvas/60"><span className={`size-2 shrink-0 rounded-full ${alert.severity === "danger" ? "bg-danger" : "bg-warning"}`} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{alert.title}</span><span className="mt-0.5 block text-xs text-muted">{alert.detail}</span></span><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${alert.severity === "danger" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}>{alert.severity === "danger" ? "Urgent" : "Review"}</span><Icon name="chevron" className="size-4 shrink-0 text-muted" /></Link>)}</div> : <div className="p-8 text-center"><span className="mx-auto grid size-10 place-items-center rounded-full bg-positive-soft text-positive"><Icon name="shield" /></span><p className="mt-3 text-sm font-semibold text-ink">No urgent alerts</p><p className="mt-1 text-xs text-muted">No items in the supported alert categories need attention.</p></div>}
            {alerts.length > 8 && <p className="border-t border-line px-5 py-3 text-xs text-muted">Showing 8 of {alerts.length} items. Use module links to review all records.</p>}
          </Panel>
          <Panel><PanelHeader eyebrow="Next seven days" title="Upcoming schedule" action={<Link to="/boarding" className="text-xs font-semibold text-positive hover:underline">Boarding ↗</Link>} />
            {upcoming.length ? <div className="divide-y divide-line">{upcoming.map((item) => <Link key={item.id} to={item.href} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas/60"><span className="grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-canvas text-center"><span className="font-mono text-sm font-bold text-ink">{new Date(`${item.date}T00:00:00`).getDate()}</span><span className="text-[8px] font-bold uppercase text-muted">{new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { month: "short" })}</span></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{item.title}</span><span className="text-xs text-muted">{item.detail}</span></span><span className="text-xs text-muted">{item.date === today ? "Today" : formatDate(item.date)}</span></Link>)}</div> : <div className="p-8 text-center text-sm text-muted">No dated boarding or season reminders in the next 7 days.</div>}
          </Panel>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel><PanelHeader eyebrow="Readiness snapshot" title="Roster by status" action={<Link to="/k9-roster" className="text-xs font-semibold text-positive">Roster ↗</Link>} />{rosterStatuses.length ? <div className="space-y-3 p-4">{rosterStatuses.map(([status, count]) => <Link key={status} to={`/k9-roster?status=${encodeURIComponent(status)}`} className="flex items-center gap-3 text-sm"><span className={`size-2 rounded-full ${status === "Medical Hold" ? "bg-warning" : status === "Active" ? "bg-positive" : status === "Deceased" ? "bg-danger" : "bg-info"}`} /><span className="flex-1 text-muted">{status}</span><span className="font-mono font-semibold text-ink">{count}</span><span className="h-1.5 w-20 overflow-hidden rounded-full bg-canvas"><span className="block h-full rounded-full bg-positive" style={{ width: `${data.k9s.length ? count / data.k9s.length * 100 : 0}%` }} /></span></Link>)}</div> : <p className="p-6 text-center text-sm text-muted">No K9 records yet.</p>}</Panel>
          <Panel><PanelHeader eyebrow="Training activity" title="Session totals" action={<Link to="/training" className="text-xs font-semibold text-positive">Registers ↗</Link>} /><TrainingBars counts={data.trainingCounts} /></Panel>
          <Panel><PanelHeader eyebrow="Shortcuts" title="Quick actions" />{<div className="grid grid-cols-2 gap-2 p-4">{[["Add K9", "/k9-roster/new", "dog"], ["New boarding", "/boarding/new", "boarding"], ["Log training", "/training", "training"], ["Start season", "/in-season/new", "season"], ["Add medical record", "/medical/records/new", "heart"], ["Record weight", "/weights", "weight"]].map(([label, href, icon]) => <Link key={href} to={href} className="flex min-h-12 items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-xs font-semibold text-ink transition hover:border-positive/50 hover:bg-positive-soft"><Icon name={icon as Parameters<typeof Icon>[0]["name"]} className="size-4 shrink-0 text-positive" /><span>{label}</span></Link>)}</div> }</Panel>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel><PanelHeader eyebrow="Latest logged events" title="Recent activity" />{recent.length ? <div className="divide-y divide-line">{recent.map((item) => <Link key={item.id} to={item.href} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas/60"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-positive-soft text-positive"><Icon name="clipboard" className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{item.title}</span><span className="text-xs text-muted">{item.category}</span></span><time className="shrink-0 text-xs text-muted" dateTime={item.date}>{formatDate(item.date)}</time></Link>)}</div> : <p className="p-8 text-center text-sm text-muted">No recent training, grooming, or vehicle records found.</p>}</Panel>
          <Panel><PanelHeader eyebrow="Care monitoring" title="Health & stock overview" />
            <div className="grid grid-cols-2 gap-3 p-4"><Link to="/medical/conditions" className="rounded-lg border border-line bg-canvas p-4 hover:border-warning/50"><p className="text-[10px] font-bold uppercase tracking-wider text-muted">High / critical conditions</p><p className="mt-2 font-mono text-2xl font-semibold text-warning">{data.conditions.filter((row) => row.severity === "High" || row.severity === "Critical").length}</p><p className="mt-1 text-xs text-muted">Recorded diagnoses</p></Link><Link to="/medical/records" className="rounded-lg border border-line bg-canvas p-4 hover:border-info/50"><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Treatments on file</p><p className="mt-2 font-mono text-2xl font-semibold text-info">{data.treatments.length}</p><p className="mt-1 text-xs text-muted">Medical records</p></Link><Link to="/medical/medications" className="rounded-lg border border-line bg-canvas p-4 hover:border-positive/50"><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Vaccines in formulary</p><p className="mt-2 font-mono text-2xl font-semibold text-positive">{new Set(data.treatments.filter((row) => row.medication_category === "Vaccine").map((row) => row.medication_id)).size}</p><p className="mt-1 text-xs text-muted">Distinct vaccine medications recorded</p></Link><Link to="/food-inventory" className="rounded-lg border border-line bg-canvas p-4 hover:border-gold/50"><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Inventory items</p><p className="mt-2 font-mono text-2xl font-semibold text-ink">{data.inventory.length}</p><p className="mt-1 text-xs text-muted">{data.inventory.filter((row) => row.remaining > 0).length} with stock remaining</p></Link></div>
            <p className="border-t border-line px-4 py-3 text-[10px] leading-4 text-muted">Vaccination due dates are not represented in current records; vaccine counts reflect distinct vaccine medications linked to treatment history, not upcoming appointments.</p>
          </Panel>
        </div>
        <p className="text-[10px] leading-4 text-muted">Data reflects records available to this workspace. Dashboard requests use existing APIs and five-minute in-memory caching; use Refresh to request current records.</p>
      </>}
    </div>
  </AppShell>
}

function getUpcomingSeasonItems(record: SeasonRecord, today: string) {
  const reminders = [7, 9, 14, 21, 28].map((day) => {
    const date = new Date(`${record.startDate}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + day - 1)
    return { day, date: date.toISOString().slice(0, 10) }
  })
  return reminders.filter((item) => item.date >= today && item.date <= (() => { const end = new Date(`${today}T00:00:00`); end.setDate(end.getDate() + 7); return localDate(end) })()).map((item) => ({ id: `season:${record.id}:${item.day}`, date: item.date, title: `${record.dogName} · season reminder`, detail: `Day ${item.day} monitoring reminder`, href: "/in-season?status=Active" }))
}
