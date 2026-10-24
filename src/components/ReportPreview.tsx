import { useState } from "react"
import Pagination from "./Pagination"
import { Panel, PanelHeader } from "./AppShell"
import type { ReportData } from "../types/reports"

export default function ReportPreview({ report }: { report: ReportData }) {
  const [page, setPage] = useState(1)
  const table = (rows: ReportData["rows"]) => <table className="w-full text-left text-xs">
    <thead className="bg-positive/10 text-ink"><tr>{report.columns.map(column => <th key={column.key} scope="col" className="px-4 py-3 font-bold">{column.label}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index} className="border-t border-line">{report.columns.map(column => <td key={column.key} className="max-w-72 break-words px-4 py-3 text-ink">{row[column.key] ?? "—"}</td>)}</tr>)}</tbody>
  </table>
  return <Panel className="report-section overflow-hidden">
    <PanelHeader eyebrow="Report details" title={report.title} />
    <div className="space-y-3 p-5">
      <p className="text-xs text-muted">{report.workspace} · {report.start} — {report.end} · Generated {new Date(report.generatedAt).toLocaleString()}</p>
      <p className="text-xs leading-relaxed text-muted">{report.note}</p>
      <dl className="flex flex-wrap gap-3">{report.totals.map(total => <div key={total.label} className="rounded-xl border border-line bg-positive/5 px-4 py-3"><dt className="text-xs text-muted">{total.label}</dt><dd className="mt-1 text-lg font-bold text-ink">{total.value}</dd></div>)}</dl>
    </div>
    {!report.rows.length ? <p className="p-5 text-sm text-muted">No records in this period.</p> : <>
      <div className="report-screen overflow-x-auto">{table(report.rows.slice((page - 1) * 20, page * 20))}<Pagination page={page} pageSize={20} totalItems={report.rows.length} onPageChange={setPage} /></div>
      <div className="report-print">{table(report.rows)}</div>
    </>}
  </Panel>
}