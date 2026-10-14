import { apiRequest } from "./auth"
import type { FoodInventoryFormValues, FoodInventoryRecord } from "../types/foodInventory"

export const foodInventoryApi = {
  async list(): Promise<FoodInventoryRecord[]> {
    const pageSize = 200
    const first = await this.page("", pageSize, 0)
    const pages = await Promise.all(Array.from({ length: Math.ceil(first.total / pageSize) - 1 }, (_, index) => this.page("", pageSize, (index + 1) * pageSize)))
    return [...first.data, ...pages.flatMap((page) => page.data)]
  },
  async page(search: string, limit: number, offset: number): Promise<{ data: FoodInventoryRecord[]; total: number }> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (search.trim()) params.set("search", search.trim())
    const result = await apiRequest(`/api/food-inventory?${params}`)
    return { data: result.data ?? [], total: Number(result.total ?? 0) }
  },
  async get(id: string): Promise<FoodInventoryRecord> { return (await apiRequest(`/api/food-inventory/${encodeURIComponent(id)}`)).data },
  async create(values: FoodInventoryFormValues): Promise<FoodInventoryRecord> { return (await apiRequest("/api/food-inventory", { method: "POST", body: JSON.stringify({ ...values, amount: Number(values.amount) }) })).data },
  async update(id: string, values: FoodInventoryFormValues): Promise<FoodInventoryRecord> { return (await apiRequest(`/api/food-inventory/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ ...values, amount: Number(values.amount) }) })).data },
  async addStock(id: string, amountKg: number): Promise<FoodInventoryRecord> { return (await apiRequest(`/api/food-inventory/${encodeURIComponent(id)}/restock`, { method: "POST", body: JSON.stringify({ amount: amountKg }) })).data },
  async remove(id: string): Promise<void> { await apiRequest(`/api/food-inventory/${encodeURIComponent(id)}`, { method: "DELETE" }) },
}