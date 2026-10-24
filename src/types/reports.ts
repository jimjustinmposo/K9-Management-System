export const REPORT_TYPES = ["food", "stock", "dogs", "car", "sales"] as const
export type ReportType = typeof REPORT_TYPES[number]
export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly"
export interface ReportData {
  type: ReportType
  title: string
  start: string
  end: string
  generatedAt: string
  workspace: string
  note: string
  columns: { key: string; label: string }[]
  rows: Record<string, string | number | null>[]
  totals: { label: string; value: string }[]
}

export function reportRange(period: ReportPeriod, reference: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reference)) throw new Error("Choose a valid date.")
  const date = new Date(`${reference}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== reference || reference < "1900-01-01" || reference > "9998-12-31") throw new Error("Choose a valid date between 1900 and 9998.")
  const start = new Date(date), end = new Date(date)
  if (period === "weekly") {
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7)
    end.setTime(start.getTime()); end.setUTCDate(end.getUTCDate() + 6)
  } else if (period === "monthly") {
    start.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() + 1, 0)
  } else if (period === "yearly") {
    start.setUTCMonth(0, 1); end.setUTCMonth(11, 31)
  } else if (period !== "daily") throw new Error("Choose a valid period.")
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}