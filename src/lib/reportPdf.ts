import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"
import type { ReportData } from "../types/reports"

export function buildReportPdf(reports: ReportData[]) {
  if (/[^\u0000-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026]/u.test(JSON.stringify(reports))) throw new Error("This report contains characters not supported by the PDF font. Use Print and Save as PDF to preserve all text.")
  const doc = new jsPDF({ orientation: "landscape" })
  reports.forEach((report, index) => {
    if (index) doc.addPage()
    doc.setFontSize(18)
    doc.text(report.title, 14, 18)
    doc.setFontSize(9)
    const heading = doc.splitTextToSize(`${report.workspace} | ${report.start} to ${report.end}\nGenerated ${report.generatedAt}\n${report.note}`, 265)
    doc.text(heading, 14, 25)
    autoTable(doc, {
      startY: 28 + heading.length * 4,
      head: [["Summary", "Value"]], body: report.totals.map(total => [total.label, total.value]),
      styles: { fontSize: 8 }, headStyles: { fillColor: [32, 65, 51] },
    })
    const summaryEnd = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
    autoTable(doc, {
      startY: summaryEnd + 7, margin: { bottom: 18 },
      head: [report.columns.map(column => column.label)],
      body: report.rows.length ? report.rows.map(row => report.columns.map(column => String(row[column.key] ?? "—"))) : [[{ content: "No records in this period.", colSpan: report.columns.length }]],
      styles: { fontSize: 8, overflow: "linebreak", cellPadding: 2 }, headStyles: { fillColor: [32, 65, 51] },
    })
  })
  const count = doc.getNumberOfPages()
  for (let page = 1; page <= count; page++) {
    doc.setPage(page); doc.setFontSize(8)
    doc.text(`Martina's K9 System | Page ${page} of ${count}`, 14, 203)
  }
  return doc
}