import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Panel } from "./AppShell"
import { boardingApi } from "../lib/boardingApi"
import { medicalApi } from "../lib/medicalApi"
import { trainingApi } from "../lib/trainingApi"
import { weightsApi } from "../lib/weightsApi"
import { feedingApi } from "../lib/feedingApi"
import type { BoardingRecord } from "../types/boarding"
import type { WeightRecord } from "../types/weights"
import type { FeedingRecord } from "../types/feeding"
import type { MedicalCondition, MedicalRecord } from "../types/medical"
import { TRAINING_DISCIPLINES, type TrainingSession } from "../types/training"

type RecordTab = "boarding" | "training" | "medical" | "handlers" | "weights" | "feeding"
type TrainingEntry = TrainingSession & { disciplineName: string }

const tabs: { id: RecordTab; label: string }[] = [
  { id: "boarding", label: "Boarding" },
  { id: "training", label: "Training" },
  { id: "medical", label: "Medical" },
  { id: "handlers", label: "Handlers" },
  { id: "weights", label: "Weights" },
  { id: "feeding", label: "Feeding" },
]

const relationshipStyles: Record<RecordTab, { accent: string; soft: string; dot: string }> = {
  boarding: { accent: "text-warning", soft: "bg-warning-soft", dot: "bg-warning" },
  training: { accent: "text-info", soft: "bg-info-soft", dot: "bg-info" },
  medical: { accent: "text-danger", soft: "bg-danger-soft", dot: "bg-danger" },
  handlers: { accent: "text-violet", soft: "bg-violet-soft", dot: "bg-violet" },
  weights: { accent: "text-positive", soft: "bg-positive-soft", dot: "bg-positive" },
  feeding: { accent: "text-info", soft: "bg-info-soft", dot: "bg-info" },
}

const dateLabel = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString() : "—"

export default function K9LinkedRecords({ k9Id }: { k9Id: string }) {
  const pageSize = 10
  const [activeTab, setActiveTab] = useState<RecordTab>("boarding")
  const [boarding, setBoarding] = useState<BoardingRecord[]>([])
  const [training, setTraining] = useState<TrainingEntry[]>([])
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([])
  const [conditions, setConditions] = useState<MedicalCondition[]>([])
  const [weights, setWeights] = useState<WeightRecord[]>([])
  const [feeding, setFeeding] = useState<FeedingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [totals, setTotals] = useState({ boarding: 0, training: 0, medical: 0, weights: 0, feeding: 0 })
  const [loadingMore, setLoadingMore] = useState(false)
  const [trainingOffsets, setTrainingOffsets] = useState<Record<string, number>>({})

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError("")
    setBoarding([])
    setTraining([])
    setMedicalRecords([])
    setConditions([])
    setWeights([])
    setFeeding([])
    setTotals({ boarding: 0, training: 0, medical: 0, weights: 0, feeding: 0 })
    setTrainingOffsets({})

    void Promise.allSettled([
      boardingApi.listForK9(k9Id, pageSize, 0),
      Promise.all(TRAINING_DISCIPLINES.map(async (discipline) => ({
        disciplineName: discipline.name,
        page: await trainingApi.listForK9(discipline.id, k9Id, pageSize, 0),
      }))),
      medicalApi.records.listForK9(k9Id, pageSize, 0),
      medicalApi.conditions.listForK9(k9Id, pageSize, 0),
      weightsApi.listForK9(k9Id, pageSize, 0),
      feedingApi.listForK9(k9Id, pageSize, 0),
    ]).then((results) => {
      if (!active) return
      const [boardingResult, trainingResult, recordsResult, conditionsResult, weightsResult, feedingResult] = results
      if (boardingResult.status === "fulfilled") {
        setBoarding(boardingResult.value.data)
        setTotals((current) => ({ ...current, boarding: boardingResult.value.total }))
      }
      if (trainingResult.status === "fulfilled") {
        setTraining(trainingResult.value.flatMap(({ disciplineName, page }) =>
          page.data.map((session) => ({ ...session, disciplineName })),
        ).sort((a, b) => b.session_date.localeCompare(a.session_date)))
        setTotals((current) => ({ ...current, training: trainingResult.value.reduce((total, item) => total + item.page.total, 0) }))
        setTrainingOffsets(Object.fromEntries(trainingResult.value.map((item) => [item.disciplineName, item.page.data.length])))
      }
      if (recordsResult.status === "fulfilled") {
        setMedicalRecords(recordsResult.value.data)
        setTotals((current) => ({ ...current, medical: current.medical + recordsResult.value.total }))
      }
      if (conditionsResult.status === "fulfilled") {
        setConditions(conditionsResult.value.data)
        setTotals((current) => ({ ...current, medical: current.medical + conditionsResult.value.total }))
      }
      if (weightsResult.status === "fulfilled") {
        setWeights(weightsResult.value.data)
        setTotals((current) => ({ ...current, weights: weightsResult.value.total }))
      }
      if (feedingResult.status === "fulfilled") {
        setFeeding(feedingResult.value.data)
        setTotals((current) => ({ ...current, feeding: feedingResult.value.total }))
      }
      const failedSections = results.flatMap((result, index) => result.status === "rejected"
        ? [["boarding", "training", "medical records", "medical conditions", "weights", "feeding"][index]]
        : [])
      if (failedSections.length) setLoadError(`Could not load ${failedSections.join(", ")}. The K9 profile is still available; apply the pending database migrations if this continues.`)
      setLoading(false)
    })

    return () => { active = false }
  }, [k9Id])

  async function loadMore() {
    setLoadingMore(true)
    setLoadError("")
    try {
      if (activeTab === "boarding") {
        const page = await boardingApi.listForK9(k9Id, pageSize, boarding.length)
        setBoarding((current) => [...current, ...page.data])
      } else if (activeTab === "training" || activeTab === "handlers") {
        const pages = await Promise.all(TRAINING_DISCIPLINES.map(async (discipline) => ({
          disciplineName: discipline.name,
          page: await trainingApi.listForK9(discipline.id, k9Id, pageSize, trainingOffsets[discipline.name] ?? 0),
        })))
        setTraining((current) => [...current, ...pages.flatMap(({ disciplineName, page }) => page.data.map((session) => ({ ...session, disciplineName })))]
          .sort((a, b) => b.session_date.localeCompare(a.session_date)))
        setTrainingOffsets((current) => Object.fromEntries(pages.map(({ disciplineName, page }) => [disciplineName, (current[disciplineName] ?? 0) + page.data.length])))
      } else if (activeTab === "medical") {
        const [recordsPage, conditionsPage] = await Promise.all([
          medicalApi.records.listForK9(k9Id, pageSize, medicalRecords.length),
          medicalApi.conditions.listForK9(k9Id, pageSize, conditions.length),
        ])
        setMedicalRecords((current) => [...current, ...recordsPage.data])
        setConditions((current) => [...current, ...conditionsPage.data])
      } else if (activeTab === "weights") {
        const page = await weightsApi.listForK9(k9Id, pageSize, weights.length)
        setWeights((current) => [...current, ...page.data])
      } else if (activeTab === "feeding") {
        const page = await feedingApi.listForK9(k9Id, pageSize, feeding.length)
        setFeeding((current) => [...current, ...page.data])
      }
    } catch {
      setLoadError("Could not load more linked records. Please try again.")
    } finally {
      setLoadingMore(false)
    }
  }

  const handlers = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; sessions: number }>()
    for (const session of training) {
      const entry = unique.get(session.handler_id)
      if (entry) entry.sessions += 1
      else unique.set(session.handler_id, { id: session.handler_id, name: session.handler_name, sessions: 1 })
    }
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [training])

  const displayedCounts: Record<RecordTab, number> = {
    boarding: boarding.length,
    training: training.length,
    medical: medicalRecords.length + conditions.length,
    handlers: handlers.length,
    weights: weights.length,
    feeding: feeding.length,
  }
  const counts: Record<RecordTab, number> = {
    boarding: totals.boarding,
    training: totals.training,
    medical: totals.medical,
    handlers: handlers.length,
    weights: totals.weights,
    feeding: totals.feeding,
  }
  const totalRelationships = Object.values(counts).reduce((total, count) => total + count, 0)
  const hasMore = activeTab === "boarding" ? boarding.length < totals.boarding
    : activeTab === "training" || activeTab === "handlers" ? training.length < totals.training
      : activeTab === "medical" ? displayedCounts.medical < totals.medical
        : activeTab === "weights" ? weights.length < totals.weights
          : activeTab === "feeding" ? feeding.length < totals.feeding
        : false

  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-line px-4 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Dog records</p>
            <h3 className="mt-1 text-base font-black text-ink">Operational relationships</h3>
          </div>
          <span className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[10px] font-bold text-slate">
            {loading ? "Loading links…" : `${totalRelationships} linked ${totalRelationships === 1 ? "record" : "records"}`}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 py-3 sm:grid-cols-3 lg:grid-cols-6">
          {tabs.map((tab) => {
            const style = relationshipStyles[tab.id]
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                aria-label={`Show ${tab.label.toLowerCase()} relationships (${counts[tab.id]})`}
                className={`group flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition hover:border-line-strong ${activeTab === tab.id ? `${style.soft} border-line-strong` : "border-line bg-surface"}`}>
                <span className={`grid size-7 shrink-0 place-items-center rounded-md ${style.soft}`}>
                  <span className={`size-2 rounded-full ${style.dot}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[9px] font-extrabold uppercase tracking-[0.08em] text-muted">{tab.id === "handlers" ? "Handlers seen" : tab.label}</span>
                  <span className={`font-mono text-sm font-bold ${style.accent}`}>{loading ? "—" : counts[tab.id]}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div role="tablist" aria-label="Dog records" className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-t-lg border-b-2 px-1.5 py-2 text-[10px] font-extrabold transition ${activeTab === tab.id ? `border-current ${relationshipStyles[tab.id].accent}` : "border-transparent text-muted hover:text-ink"}`}>
              {tab.label} <span className="ml-0.5 opacity-70">{loading ? "—" : tab.id === "handlers" ? displayedCounts.handlers : `${displayedCounts[tab.id]}/${counts[tab.id]}`}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[390px] min-h-36 overflow-y-auto p-3" role="tabpanel" aria-label={`${activeTab} records`}>
        {loadError && <p role="alert" className="mb-2 rounded-lg bg-danger-soft p-2 text-[11px] font-semibold text-danger">{loadError}</p>}
        {loading ? (
          <div className="space-y-2" aria-label="Loading dog records">
            <div className="h-16 animate-pulse rounded-lg bg-canvas" />
            <div className="h-16 animate-pulse rounded-lg bg-canvas" />
          </div>
        ) : counts[activeTab] === 0 ? (
          <div className="grid min-h-28 place-items-center rounded-lg border border-dashed border-line px-3 text-center">
            <p className="text-xs font-semibold text-muted">No {activeTab === "handlers" ? "handlers from training records" : `${activeTab} records`} linked to this dog.</p>
          </div>
        ) : (
          <div className="relative space-y-2 pl-6 before:absolute before:bottom-4 before:left-[9px] before:top-4 before:w-px before:bg-line-strong">
            {activeTab === "boarding" && boarding.map((record) => (
              <article key={record.id} className="relative rounded-lg border border-line bg-canvas/70 p-3 transition hover:border-line-strong">
                <span aria-hidden="true" className={`absolute -left-[21px] top-4 size-[10px] rounded-full border-2 border-surface ${relationshipStyles.boarding.dot}`} />
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-xs font-extrabold text-ink">{record.status}</p><p className="mt-1 text-[11px] text-muted">{dateLabel(record.checkInDate)}{record.checkOutDate ? ` – ${dateLabel(record.checkOutDate)}` : " – Current"}</p></div>
                  <Link to={`/boarding/${record.id}/edit`} className="text-[10px] font-extrabold text-info hover:underline">Open</Link>
                </div>
                <p className="mt-2 text-[11px] text-slate">Owner: <span className="font-bold">{record.ownerName || "—"}</span>{record.ownerPhone ? ` · ${record.ownerPhone}` : ""}</p>
                <p className="mt-1 text-[11px] text-slate">Rate: <span className="font-bold">{record.currency} {record.pricePerDay.toFixed(2)}/day</span>{record.totalAmount != null ? ` · Total ${record.currency} ${record.totalAmount.toFixed(2)}` : ""}</p>
                {record.notes && <p className="mt-1 break-words text-[11px] text-muted">{record.notes}</p>}
              </article>
            ))}

            {activeTab === "training" && training.map((session) => (
              <article key={`${session.disciplineName}-${session.id}`} className="relative rounded-lg border border-line bg-canvas/70 p-3 transition hover:border-line-strong">
                <span aria-hidden="true" className={`absolute -left-[21px] top-4 size-[10px] rounded-full border-2 border-surface ${relationshipStyles.training.dot}`} />
                <div className="flex items-start justify-between gap-2"><p className="text-xs font-extrabold text-ink">{session.disciplineName}</p><span className="text-[10px] font-semibold text-muted">{dateLabel(session.session_date)}</span></div>
                <p className="mt-1 text-[11px] text-slate">Handler: <span className="font-bold">{session.handler_name}</span></p>
                {session.note && <p className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-4 text-muted">{session.note}</p>}
              </article>
            ))}

            {activeTab === "medical" && <>
              {medicalRecords.map((record) => (
                <article key={record.id} className="relative rounded-lg border border-line bg-canvas/70 p-3 transition hover:border-line-strong">
                  <span aria-hidden="true" className={`absolute -left-[21px] top-4 size-[10px] rounded-full border-2 border-surface ${relationshipStyles.medical.dot}`} />
                  <div className="flex items-start justify-between gap-2"><p className="text-xs font-extrabold text-ink">{record.medication_name}</p><span className="text-[10px] font-semibold text-muted">{dateLabel(record.start_date)}</span></div>
                  <p className="mt-1 text-[11px] text-slate">{record.dosage_given} · {record.administration_method} · {record.frequency}</p>
                  {record.end_date && <p className="mt-1 text-[10px] text-muted">Until {dateLabel(record.end_date)}</p>}
                  {record.administered_by && <p className="mt-1 text-[10px] text-muted">Given by {record.administered_by}</p>}
                  {record.notes && <p className="mt-1 break-words text-[11px] text-muted">{record.notes}</p>}
                </article>
              ))}
              {conditions.map((condition) => (
                <article key={condition.id} className="relative rounded-lg border border-line bg-canvas/70 p-3 transition hover:border-line-strong">
                  <span aria-hidden="true" className={`absolute -left-[21px] top-4 size-[10px] rounded-full border-2 border-surface ${relationshipStyles.medical.dot}`} />
                  <div className="flex items-start justify-between gap-2"><p className="text-xs font-extrabold text-ink">{condition.condition_name}</p><span className="rounded-full bg-danger-soft px-2 py-0.5 text-[9px] font-extrabold text-danger">{condition.severity}</span></div>
                  <p className="mt-1 text-[10px] text-muted">Diagnosed {dateLabel(condition.diagnosis_date)}</p>
                  {condition.notes && <p className="mt-1 break-words text-[11px] text-slate">{condition.notes}</p>}
                </article>
              ))}
            </>}

            {activeTab === "handlers" && handlers.map((handler) => (
              <article key={handler.id} className="relative flex items-center justify-between gap-3 rounded-lg border border-line bg-canvas/70 p-3 transition hover:border-line-strong">
                <span aria-hidden="true" className={`absolute -left-[21px] top-4 size-[10px] rounded-full border-2 border-surface ${relationshipStyles.handlers.dot}`} />
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-black ${relationshipStyles.handlers.soft} ${relationshipStyles.handlers.accent}`} aria-hidden="true">
                    {handler.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "—"}
                  </span>
                  <span className="min-w-0"><span className="block truncate text-xs font-extrabold text-ink">{handler.name}</span><span className="mt-1 block text-[10px] text-muted">Assigned in this dog’s training records</span></span>
                </div>
                <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10px] font-bold text-slate">{handler.sessions} {handler.sessions === 1 ? "session" : "sessions"}</span>
              </article>
            ))}

            {activeTab === "weights" && weights.map((record) => (
              <article key={record.id} className="relative rounded-lg border border-line bg-canvas/70 p-3 transition hover:border-line-strong">
                <span aria-hidden="true" className={`absolute -left-[21px] top-4 size-[10px] rounded-full border-2 border-surface ${relationshipStyles.weights.dot}`} />
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-xs font-extrabold text-ink">{record.weight} kg</p><p className="mt-1 text-[11px] text-muted">{dateLabel(record.date)}{record.nickname ? ` · ${record.nickname}` : ""}</p></div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${relationshipStyles.weights.soft} ${relationshipStyles.weights.accent}`}>
                    {record.difference == null ? "Initial" : `${record.difference > 0 ? "+" : ""}${record.difference} kg`}
                  </span>
                </div>
              </article>
            ))}

            {activeTab === "feeding" && feeding.map((record) => (
              <article key={record.id} className="relative rounded-lg border border-line bg-canvas/70 p-3 transition hover:border-line-strong">
                <span aria-hidden="true" className={`absolute -left-[21px] top-4 size-[10px] rounded-full border-2 border-surface ${relationshipStyles.feeding.dot}`} />
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-xs font-extrabold text-ink">{record.food}</p><p className="mt-1 text-[11px] text-muted">{dateLabel(record.date)} · {record.grams.toLocaleString()} g</p></div>
                  <Link to={`/feeding/${encodeURIComponent(record.id)}/edit`} className="text-[10px] font-extrabold text-info hover:underline">Open</Link>
                </div>
                <p className="mt-2 text-[11px] text-slate">Handler: <span className="font-bold">{record.handler_name}</span></p>
                {record.noted && <p className="mt-1 break-words text-[11px] text-muted">{record.noted}</p>}
              </article>
            ))}
          </div>
        )}
        {!loading && hasMore && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
            <p className="text-[10px] font-semibold text-muted">Showing {displayedCounts[activeTab]} of {counts[activeTab]}</p>
            <button type="button" onClick={() => void loadMore()} disabled={loadingMore}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-[11px] font-extrabold text-ink transition hover:border-line-strong disabled:opacity-60">
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </Panel>
  )
}