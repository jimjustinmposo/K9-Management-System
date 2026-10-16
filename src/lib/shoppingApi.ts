import { apiRequest } from "./auth"
import type { ShoppingFormValues, ShoppingRecord } from "../types/shopping"

export const shoppingApi = {
  async page(search: string, type: string, limit: number, offset: number): Promise<{ data: ShoppingRecord[]; total: number }> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (search.trim()) params.set("search", search.trim())
    if (type !== "all") params.set("type", type)
    const result = await apiRequest(`/api/shopping?${params}`)
    return { data: result.data ?? [], total: Number(result.total ?? 0) }
  },
  async get(id: string): Promise<ShoppingRecord> { return (await apiRequest(`/api/shopping/${encodeURIComponent(id)}`)).data },
  async create(values: ShoppingFormValues): Promise<ShoppingRecord> {
    return (await apiRequest("/api/shopping", { method: "POST", body: JSON.stringify({ ...values, quantity: Number(values.quantity), price: Number(values.price) }) })).data
  },
  async update(id: string, values: ShoppingFormValues): Promise<ShoppingRecord> {
    return (await apiRequest(`/api/shopping/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ ...values, quantity: Number(values.quantity), price: Number(values.price) }) })).data
  },
  async remove(id: string): Promise<void> { await apiRequest(`/api/shopping/${encodeURIComponent(id)}`, { method: "DELETE" }) },
}