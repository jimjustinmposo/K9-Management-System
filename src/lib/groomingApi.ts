import { cachedApiFetch, invalidateApiCache } from "./apiCache"
import type { GroomingFormValues, GroomingRecord } from "../types/grooming"

type Row = Record<string, unknown>
type Page = { data: GroomingRecord[]; total: number }

function mapRow(row: Row): GroomingRecord {
  return {
    id: String(row.id), k9Id: String(row.k9_id), dogName: String(row.dog_name ?? "Registered K9"), nickName: String(row.nick_name ?? ""),
    date: String(row.date), bathing: Boolean(row.bathing), nails: Boolean(row.nails), ears: String(row.ears ?? ""), brushing: Boolean(row.brushing),
    price: Number(row.price ?? 0), createdAt: String(row.created_at ?? ""), updatedAt: String(row.updated_at ?? ""),
  }
}

async function request(path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(path, init)
  let data: any
  try { data = await response.json() } catch { data = null }
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : `Request failed (${response.status})`)
  return data
}

function payload(values: GroomingFormValues) {
  return { k9_id: values.k9Id, date: values.date, bathing: values.bathing, nails: values.nails, ears: values.ears.trim(), brushing: values.brushing, price: Number(values.price) }
}

export const groomingApi = {
  async updateCare(id: string, field: "bathing" | "nails" | "brushing", checked: boolean): Promise<GroomingRecord> {
    const data = await request(`/api/grooming/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: checked }) })
    invalidateApiCache(`/api/grooming/${encodeURIComponent(id)}`); invalidateApiCache("/api/grooming")
    return mapRow(data.data)
  },
  async list(options: { search?: string; limit?: number; offset?: number } = {}): Promise<Page> {
    const params = new URLSearchParams({ limit: String(options.limit ?? 50), offset: String(options.offset ?? 0) })
    if (options.search?.trim()) params.set("search", options.search.trim())
    const path = `/api/grooming?${params}`
    const response = await cachedApiFetch(path, () => fetch(path))
    const data = await response.json() as { data?: Row[]; total?: number; error?: string }
    if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`)
    return { data: (data.data ?? []).map(mapRow), total: Number(data.total ?? 0) }
  },
  async get(id: string): Promise<GroomingRecord | null> {
    const data = await request(`/api/grooming/${encodeURIComponent(id)}`)
    return data?.data ? mapRow(data.data) : null
  },
  async create(values: GroomingFormValues): Promise<GroomingRecord> {
    const data = await request("/api/grooming", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(values)) })
    invalidateApiCache("/api/grooming")
    return mapRow(data.data)
  },
  async update(id: string, values: GroomingFormValues): Promise<GroomingRecord> {
    const data = await request(`/api/grooming/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(values)) })
    invalidateApiCache(`/api/grooming/${encodeURIComponent(id)}`); invalidateApiCache("/api/grooming")
    return mapRow(data.data)
  },
  async remove(id: string): Promise<void> {
    await request(`/api/grooming/${encodeURIComponent(id)}`, { method: "DELETE" })
    invalidateApiCache(`/api/grooming/${encodeURIComponent(id)}`); invalidateApiCache("/api/grooming")
  },
}