import { useEffect, useState } from "react"
import { Download, Printer, RefreshCw } from "lucide-react"
import ReportPreview from "../components/ReportPreview"
import { getReport } from "../lib/reportsApi"
import { REPORT_TYPES, reportRange, type ReportData, type ReportPeriod, type ReportType } from "../types/reports"

const names: Record<ReportType, string> = { food: "Food", stock: "Stock", dogs: "Dogs", car: "Car", sales: "Sales" }
const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}` }
export default function ReportsPage() {
  const [selected, setSelected] = useState<ReportType[]>(["food"])
  const [period, setPeriod] = useState<ReportPeriod>("monthly")
  const [date, setDate] = useState(today)
  const [refresh, setRefresh] = useState(0)
  const [result, setResult] = useState<{ key: string; reports: ReportData[] }>({ key: "", reports: [] })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const key = `${selected.join(",")}:${period}:${date}:${refresh}`
  const reports = result.key === key ? result.reports : []
  let rangeLabel = "Choose a valid reference date"
  try { const range = reportRange(period, date); rangeLabel = `${range.start} — ${range.end}` } catch { /* shown below */ }
  useEffect(() => {
    const controller = new AbortController()
    setError(""); setLoading(true)
    if (!selected.length) { setLoading(false); return () => controller.abort() }
    try { reportRange(period, date) } catch { setError("Choose a valid reference date."); setLoading(false); return () => controller.abort() }
    Promise.all(selected.map(type => getReport(type, period, date, controller.signal)))
      .then(data => { if (!controller.signal.aborted) setResult({ key, reports: data }) })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to load reports.") })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [key, selected, period, date])
  const download = async () => {
    setExporting(true); setError("")
    try { const { buildReportPdf } = await import("../lib/reportPdf"); buildReportPdf(reports).save(`k9-${selected.join("-")}-${period}-${date}.pdf`) }
    catch (reason) { setError(reason instanceof Error ? reason.message : "PDF generation failed. Try again or use Print to save a PDF.") }
    finally { setExporting(false) }
  }
  const disabled = loading || exporting || !reports.length
  return <div className="reports-page space-y-5">
    <div className="report-controls"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-positive">Owner workspace · reporting</p><h1 className="mt-1 text-2xl font-bold text-ink">Reports</h1><p className="mt-2 text-sm text-muted">Choose your reports and period. Download one combined PDF or print all selected reports.</p></div>
    <section aria-label="Report settings" className="report-controls space-y-5 rounded-2xl border border-line bg-surface p-5">
      <fieldset><legend className="mb-3 text-sm font-bold text-ink">Include reports</legend><div className="flex flex-wrap gap-2">{REPORT_TYPES.map(type => <label key={type} className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${selected.includes(type) ? "border-positive bg-positive/10 text-positive" : "border-line text-muted"}`}><input type="checkbox" checked={selected.includes(type)} onChange={() => setSelected(current => REPORT_TYPES.filter(value => value === type ? !current.includes(value) : current.includes(value)))} />{names[type]}</label>)}</div></fieldset>
      <div className="flex flex-wrap items-end gap-4"><label className="text-xs font-bold text-muted">Period<select className="mt-2 block rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink" value={period} onChange={event => setPeriod(event.target.value as ReportPeriod)}>{(["daily", "weekly", "monthly", "yearly"] as const).map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label><label className="text-xs font-bold text-muted">Reference date<input className="mt-2 block rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink" type="date" min="1900-01-01" max="9998-12-31" value={date} onChange={event => setDate(event.target.value)} /></label><p className="pb-2 text-sm font-semibold text-positive">{rangeLabel}</p></div>
      <div className="flex flex-wrap gap-2"><button className="button-primary flex items-center gap-2 px-4 py-2" disabled={disabled} onClick={download}><Download size={16} />{exporting ? "Preparing PDF…" : "Download PDF"}</button><button className="button-secondary flex items-center gap-2 px-4 py-2" disabled={disabled} onClick={() => window.print()}><Printer size={16} />Print selected</button><button className="button-secondary flex items-center gap-2 px-4 py-2" disabled={loading || exporting || !selected.length} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />Refresh</button></div>
      <p className="text-xs text-muted">Weeks run Monday–Sunday. Preview tables show 20 rows per page; PDF and print include every loaded row. Maximum 5,000 rows per report.</p>
    </section>
    {error && <p role="alert" className="report-controls rounded-xl border border-red-400 p-4 text-sm text-red-600">{error}</p>}
    {loading && <p role="status" className="report-controls text-sm text-muted">Loading selected reports…</p>}
    {!selected.length && <p className="text-sm text-muted">Select at least one report to begin.</p>}
    {reports.map(report => <ReportPreview key={`${key}:${report.type}`} report={report} />)}
  </div>
}