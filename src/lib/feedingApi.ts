import { apiRequest } from "./auth"
import type { FeedingFormValues, FeedingRecord } from "../types/feeding"

export const feedingApi = {
  async page(search: string, limit: number, offset: number): Promise<{ data: FeedingRecord[]; total: number }> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (search.trim()) params.set("search", search.trim())
    const result = await apiRequest(`/api/feeding?${params}`)
    return { data: result.data ?? [], total: Number(result.total ?? 0) }
  },
  async listForK9(k9Id: string, limit: number, offset: number): Promise<{ data: FeedingRecord[]; total: number }> {
    const params = new URLSearchParams({ k9_id: k9Id, limit: String(limit), offset: String(offset) })
    const result = await apiRequest(`/api/feeding?${params}`)
    return { data: result.data ?? [], total: Number(result.total ?? 0) }
  },
  async get(id: string): Promise<FeedingRecord> { return (await apiRequest(`/api/feeding/${encodeURIComponent(id)}`)).data },
  async create(values: FeedingFormValues): Promise<FeedingRecord> { return (await apiRequest("/api/feeding", { method: "POST", body: JSON.stringify({ ...values, grams: Number(values.grams) * (values.unit === "kg" ? 1000 : 1) }) })).data },
  async update(id: string, values: FeedingFormValues): Promise<FeedingRecord> { return (await apiRequest(`/api/feeding/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ ...values, grams: Number(values.grams) * (values.unit === "kg" ? 1000 : 1) }) })).data },
  async remove(id: string): Promise<void> { await apiRequest(`/api/feeding/${encodeURIComponent(id)}`, { method: "DELETE" }) },
}