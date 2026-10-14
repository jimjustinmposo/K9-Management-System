import { apiRequest } from "./auth"
import type { WeightInput, WeightRecord } from "../types/weights"

export const weightsApi = {
  async page(search: string, limit: number, offset: number): Promise<{ data: WeightRecord[]; total: number }> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (search.trim()) params.set("search", search.trim())
    const result = await apiRequest(`/api/weights?${params}`)
    return { data: result.data ?? [], total: Number(result.total ?? 0) }
  },
  async listForK9(dogId: string, limit: number, offset: number): Promise<{ data: WeightRecord[]; total: number }> {
    const params = new URLSearchParams({ dog_id: dogId, limit: String(limit), offset: String(offset) })
    const result = await apiRequest(`/api/weights?${params}`)
    return { data: result.data ?? [], total: Number(result.total ?? 0) }
  },
  async create(date: string, entries: WeightInput[]): Promise<void> {
    await apiRequest("/api/weights", { method: "POST", body: JSON.stringify({ date, entries: entries.map((entry) => ({ ...entry, weight: Number(entry.weight) })) }) })
  },
  async get(id: string): Promise<WeightRecord> { return (await apiRequest(`/api/weights/${encodeURIComponent(id)}`)).data },
  async update(id: string, values: { date: string; weight: number }): Promise<WeightRecord> {
    return (await apiRequest(`/api/weights/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(values) })).data
  },
  async remove(id: string): Promise<void> { await apiRequest(`/api/weights/${encodeURIComponent(id)}`, { method: "DELETE" }) },
}