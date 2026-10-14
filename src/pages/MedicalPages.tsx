import { useCallback, useEffect, useState } from "react"
import { useLatestLoad } from "../lib/useLatestLoad"
import { Link } from "react-router-dom"
import { AppShell, Panel, PanelHeader } from "../components/AppShell"
import { medicalApi } from "../lib/medicalApi"
import { useAuth } from "../lib/auth"
import type { MedicalCondition, MedicalRecord, Medication } from "../types/medical"
import Pagination from "../components/Pagination"

type Kind = "medications" | "records" | "conditions"
const config: Record<Kind, { title: string; eyebrow: string; create: string; label: string }> = {
  medications: { title: "Medication formulary", eyebrow: "Medical · Reference", create: "/medical/medications/new", label: "Medication" },
  records: { title: "Treatment records", eyebrow: "Medical · Care log", create: "/medical/records/new", label: "Treatment" },
  conditions: { title: "Health conditions", eyebrow: "Medical · Patient history", create: "/medical/conditions/new", label: "Condition" },
}
function date(value: string) { return value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString() : "—" }

export function MedicalHomePage() {
  return <AppShell title="Medical Overview"><div className="mx-auto max-w-6xl space-y-7">
    <div className="border-l-2 border-positive pl-4 py-1"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-positive">K9 health · records & care</p><h2 className="mt-1 text-xl font-semibold text-ink">Care, clearly documented.</h2><p className="mt-1 max-w-xl text-sm leading-5 text-muted">Keep treatments, medications and diagnoses connected to each registered K9.</p></div>
    <div className="grid gap-4 md:grid-cols-3">{(["records", "conditions", "medications"] as Kind[]).map((kind) => <MedicalCard key={kind} kind={kind} />)}</div>
    <Panel className="p-5"><p className="text-sm font-bold text-ink">Clinical recordkeeping</p><p className="mt-1 text-sm leading-6 text-muted">This module records information entered by your team. Confirm medication choices and dosing with a qualified veterinarian.</p></Panel>
  </div></AppShell>
}
function MedicalCard({ kind }: { kind: Kind }) {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    let active = true
    void medicalApi.count(kind).then((total) => { if (active) setCount(total) }).catch(() => { if (active) setCount(null) })
    return () => { active = false }
  }, [kind])
  const item = config[kind]
  const href = `/medical/${kind}`
  return <Link to={href} className="group rounded-2xl border border-line bg-surface p-5 shadow-filter transition hover:-translate-y-0.5 hover:border-positive/40"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-positive-soft text-positive font-mono text-sm font-black">{kind === "records" ? "RX" : kind === "conditions" ? "HX" : "M"}</span><span className="text-xs font-bold text-muted">{count ?? "—"} entries ↗</span></div><p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.16em] text-muted">{item.eyebrow}</p><h3 className="mt-1 text-lg font-bold text-ink group-hover:text-positive">{item.title}</h3></Link>
}

export function MedicalListPage({ kind }: { kind: Kind }) {
  const PAGE_SIZE = 10
  const { session } = useAuth()
  const [items, setItems] = useState<(Medication | MedicalRecord | MedicalCondition)[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const read = useCallback(() => medicalApi.page<Medication | MedicalRecord | MedicalCondition>(`/api/medical/${kind}`, kind === "medications" ? search : "", pageSize, (page - 1) * pageSize), [kind, search, page, pageSize])
  const accept = useCallback((result: { data: (Medication | MedicalRecord | MedicalCondition)[]; total: number }) => { setItems(result.data); setTotal(result.total) }, [])
  const load = useLatestLoad(read, accept, setLoading, setError, "Could not load medical data.", kind === "medications" ? search : "")
  useEffect(() => { setPage(1) }, [kind, search])
  async function deleteItem(id: string) {
    if (!window.confirm(`Delete this ${config[kind].label.toLowerCase()}?`)) return
    try { if (kind === "medications") await medicalApi.medications.remove(id); else if (kind === "records") await medicalApi.records.remove(id); else await medicalApi.conditions.remove(id); await load() }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete entry.") }
  }
  return <AppShell title={config[kind].label + (kind === "records" ? "s" : "s")}><div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><Link to="/medical" className="text-xs font-medium text-positive">← Medical overview</Link><p className="mt-4 text-[10px] font-semibold uppercase tracking-[.12em] text-positive">{config[kind].eyebrow}</p><h2 className="mt-1 text-xl font-semibold text-ink">{config[kind].title}</h2></div>{session?.permissions.create && <Link to={config[kind].create} className="button-primary">+ Add {config[kind].label.toLowerCase()}</Link>}</div>
    {kind === "medications" && <input aria-label="Search medications" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medication name or category…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-positive md:max-w-sm"/>}
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
    <Panel><PanelHeader eyebrow="Clinical register" title={`${total} ${config[kind].label.toLowerCase()}${total === 1 ? "" : "s"}`} />{loading ? <p className="p-8 text-center text-sm text-muted">Loading records…</p> : total === 0 ? <p className="p-10 text-center text-sm text-muted">No entries yet. Add the first one when ready.</p> : <div className="divide-y divide-line">{items.map((item) => {
      const isMed = kind === "medications", isRecord = kind === "records"
      const record = item as MedicalRecord, condition = item as MedicalCondition, medication = item as Medication
      const title = isMed ? medication.name : isRecord ? `${record.dog_name}${record.medication_name ? ` · ${record.medication_name}` : ""}` : `${condition.dog_name} · ${condition.condition_name}`
      const subtitle = isMed ? `${medication.category}${medication.description ? ` · ${medication.description}` : ""}` : isRecord ? `${record.dosage_given} · ${record.administration_method} · ${record.frequency}` : `Severity: ${condition.severity}`
      const meta = isMed ? medication.dosage_guideline || "Dosage guideline not specified" : isRecord ? `${date(record.start_date)}${record.end_date ? ` – ${date(record.end_date)}` : " · Ongoing"}${record.administered_by ? ` · ${record.administered_by}` : ""}` : `Diagnosed ${date(condition.diagnosis_date)}`
      const id = item.id
      const editPath = `/medical/${kind}/${encodeURIComponent(id)}/edit`
      return <article key={id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><h3 className="truncate text-sm font-bold text-ink">{title}</h3><p className="mt-1 text-xs text-muted">{subtitle}</p><p className="mt-1 text-[11px] text-muted/80">{meta}</p></div><div className="flex shrink-0 items-center gap-2">{isRecord && <span className="rounded-full bg-positive-soft px-2.5 py-1 text-[10px] font-bold text-positive">Treatment</span>}{session?.permissions.edit && <Link className="button-edit" to={editPath}>Edit</Link>}{session?.permissions.delete && <button type="button" className="button-delete" onClick={() => void deleteItem(id)}>Delete</button>}</div></article>
    })}</div>}{!loading && total > 0 && <Pagination page={page} totalItems={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} label={config[kind].label.toLowerCase() + "s"} />}</Panel>
    <p className="text-xs text-muted">For veterinary use: team-entered notes are not a substitute for advice from a licensed veterinarian.</p>
  </div></AppShell>
}