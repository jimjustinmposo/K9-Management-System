import type { ReportData, ReportPeriod, ReportType } from "../types/reports"

export async function getReport(type: ReportType, period: ReportPeriod, date: string, signal: AbortSignal, dogIds: string[] = []): Promise<ReportData> {
  const params = new URLSearchParams({ period, date })
  if (type === "dogs") dogIds.forEach(id => params.append("dog", id))
  const response = await fetch(`/api/reports/${type}?${params}`, { credentials: "same-origin", cache: "no-store", signal })
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Reports require the Pages Functions / D1 backend; local demo data is not used.")
  const body = await response.json() as { data?: ReportData; error?: string }
  if (!response.ok || !body.data) throw new Error(body.error || "Unable to load report.")
  return body.data
}