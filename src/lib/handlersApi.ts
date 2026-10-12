import { apiRequest } from "./auth"
import type { Handler, HandlerFormValues } from "../types/handlers"

export const handlersApi = {
  async list(search = ""): Promise<Handler[]> {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""
    const response = await apiRequest(`/api/handlers${query}`)
    return response.data ?? []
  },
  async get(id: string): Promise<Handler> {
    return (await apiRequest(`/api/handlers/${encodeURIComponent(id)}`)).data
  },
  async create(values: HandlerFormValues): Promise<Handler> {
    return (await apiRequest("/api/handlers", { method: "POST", body: JSON.stringify(values) })).data
  },
  async update(id: string, values: HandlerFormValues): Promise<Handler> {
    return (await apiRequest(`/api/handlers/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(values) })).data
  },
  async remove(id: string): Promise<void> {
    await apiRequest(`/api/handlers/${encodeURIComponent(id)}`, { method: "DELETE" })
  },
}