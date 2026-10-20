import { cachedApiFetch, invalidateApiCache } from "./apiCache"
import type { SeasonFormValues, SeasonRecord } from "../types/inSeason"

type Row = Record<string, unknown>
type Page = { data: SeasonRecord[]; total: number }

function mapRow(row: Row): SeasonRecord {
  return {
    id: String(row.id), k9Id: String(row.k9_id), dogName: String(row.dog_name ?? "Registered K9"),
    nickName: String(row.nick_name ?? ""), breed: String(row.breed ?? ""), profilePhoto: String(row.profile_photo ?? ""),
    startDate: String(row.start_date), endDate: String(row.end_date ?? ""), status: row.status === "Ended" ? "Ended" : "Active",
    notes: String(row.notes ?? ""), createdAt: String(row.created_at ?? ""), updatedAt: String(row.updated_at ?? ""),
  }
}

async function request(path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(path, init)
  let data: any
  try { data = await response.json() } catch { data = null }
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : `Request failed (${response.status})`)
  return data
}

function payload(values: SeasonFormValues) {
  return { k9_id: values.k9Id, start_date: values.startDate, end_date: values.endDate, notes: values.notes.trim() }
}

export const inSeasonApi = {
  async list(options: { k9Id?: string; status?: string; search?: string; limit?: number; offset?: number } = {}): Promise<Page> {
    const params = new URLSearchParams()
    if (options.k9Id) params.set("k9_id", options.k9Id)
    if (options.status && options.status !== "All") params.set("status", options.status)
    if (options.search) params.set("search", options.search)
    params.set("limit", String(options.limit ?? 200)); params.set("offset", String(options.offset ?? 0))
    const path = `/api/in-season?${params}`
    const response = await cachedApiFetch(path, () => fetch(path))
    const data = await response.json() as { data?: Row[]; total?: number; error?: string }
    if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`)
    return { data: (data.data ?? []).map(mapRow), total: Number(data.total ?? 0) }
  },
  async get(id: string): Promise<SeasonRecord | null> {
    const data = await request(`/api/in-season/${encodeURIComponent(id)}`)
    return data?.data ? mapRow(data.data) : null
  },
  async create(values: SeasonFormValues): Promise<SeasonRecord> {
    const data = await request("/api/in-season", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(values)) })
    invalidateApiCache("/api/in-season")
    return mapRow(data.data)
  },
  async update(id: string, values: SeasonFormValues): Promise<SeasonRecord> {
    const data = await request(`/api/in-season/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(values)) })
    invalidateApiCache(`/api/in-season/${encodeURIComponent(id)}`); invalidateApiCache("/api/in-season")
    return mapRow(data.data)
  },
  async remove(id: string): Promise<void> {
    await request(`/api/in-season/${encodeURIComponent(id)}`, { method: "DELETE" })
    invalidateApiCache(`/api/in-season/${encodeURIComponent(id)}`); invalidateApiCache("/api/in-season")
  },
}