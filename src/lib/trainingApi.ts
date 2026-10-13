import { apiRequest } from "./auth"
import type { TrainingDiscipline, TrainingFormValues, TrainingSession } from "../types/training"

export const trainingApi = {
  async page(discipline: TrainingDiscipline, search: string, limit: number, offset: number): Promise<{ data: TrainingSession[]; total: number }> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (search.trim()) params.set("search", search.trim())
    const response = await apiRequest(`/api/training/${discipline}?${params.toString()}`)
    return { data: response.data ?? [], total: Number(response.total ?? 0) }
  },
  async list(discipline: TrainingDiscipline, search = ""): Promise<TrainingSession[]> {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""
    return (await apiRequest(`/api/training/${discipline}${query}`)).data ?? []
  },
  async listForK9(discipline: TrainingDiscipline, k9Id: string, limit: number, offset: number): Promise<{ data: TrainingSession[]; total: number }> {
    const params = new URLSearchParams({ k9_id: k9Id, limit: String(limit), offset: String(offset) })
    const response = await apiRequest(`/api/training/${discipline}?${params.toString()}`)
    return { data: response.data ?? [], total: Number(response.total ?? 0) }
  },
  async get(discipline: TrainingDiscipline, id: string): Promise<TrainingSession> {
    return (await apiRequest(`/api/training/${discipline}/${encodeURIComponent(id)}`)).data
  },
  async create(discipline: TrainingDiscipline, values: TrainingFormValues): Promise<TrainingSession> {
    return (await apiRequest(`/api/training/${discipline}`, { method: "POST", body: JSON.stringify(values) })).data
  },
  async update(discipline: TrainingDiscipline, id: string, values: TrainingFormValues): Promise<TrainingSession> {
    return (await apiRequest(`/api/training/${discipline}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(values) })).data
  },
  async remove(discipline: TrainingDiscipline, id: string): Promise<void> {
    await apiRequest(`/api/training/${discipline}/${encodeURIComponent(id)}`, { method: "DELETE" })
  },
}