import { cachedApiFetch, invalidateApiCache } from "./apiCache"
import type { CarUsageFormValues, CarUsageRecord } from "../types/carUsage"

type Row = Record<string, unknown>
type Page = { data: CarUsageRecord[]; total: number }

function mapRow(row: Row): CarUsageRecord {
  return {
    id: String(row.id), k9Id: String(row.k9_id), dogName: String(row.dog_name ?? "Registered K9"), nickName: String(row.nick_name ?? ""),
    date: String(row.date), driver: String(row.driver), timeIn: String(row.time_in), kmStart: Number(row.km_start),
    timeOut: String(row.time_out), kmEnd: Number(row.km_end), createdAt: String(row.created_at ?? ""), updatedAt: String(row.updated_at ?? ""),
  }
}

async function request(path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(path, init)
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : `Request failed (${response.status})`)
  return data
}

function payload(values: CarUsageFormValues) {
  return { k9_id: values.k9Id, date: values.date, driver: values.driver.trim(), time_in: values.timeIn, km_start: Number(values.kmStart), time_out: values.timeOut, km_end: Number(values.kmEnd) }
}

export const carUsageApi = {
  async list(options: { search?: string; limit?: number; offset?: number } = {}): Promise<Page> {
    const params = new URLSearchParams({ limit: String(options.limit ?? 50), offset: String(options.offset ?? 0) })
    if (options.search?.trim()) params.set("search", options.search.trim())
    const path = `/api/car-usage?${params}`
    const response = await cachedApiFetch(path, () => fetch(path))
    const data = await response.json() as { data?: Row[]; total?: number; error?: string }
    if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`)
    return { data: (data.data ?? []).map(mapRow), total: Number(data.total ?? 0) }
  },
  async get(id: string): Promise<CarUsageRecord | null> {
    const data = await request(`/api/car-usage/${encodeURIComponent(id)}`)
    return data?.data ? mapRow(data.data) : null
  },
  async create(values: CarUsageFormValues): Promise<CarUsageRecord> {
    const data = await request("/api/car-usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(values)) })
    invalidateApiCache("/api/car-usage")
    return mapRow(data.data)
  },
  async update(id: string, values: CarUsageFormValues): Promise<CarUsageRecord> {
    const data = await request(`/api/car-usage/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(values)) })
    invalidateApiCache(`/api/car-usage/${encodeURIComponent(id)}`); invalidateApiCache("/api/car-usage")
    return mapRow(data.data)
  },
  async remove(id: string): Promise<void> {
    await request(`/api/car-usage/${encodeURIComponent(id)}`, { method: "DELETE" })
    invalidateApiCache(`/api/car-usage/${encodeURIComponent(id)}`); invalidateApiCache("/api/car-usage")
  },
}