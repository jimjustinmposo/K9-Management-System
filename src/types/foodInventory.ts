export interface FoodInventoryRecord {
  id: string
  date: string
  item: string
  brand: string
  amount: number
  used: number
  remaining: number
  created_at: string
  updated_at: string
}

export interface FoodInventoryFormValues {
  date: string
  item: string
  brand: string
  amount: string
}

export const EMPTY_FOOD_INVENTORY_FORM: FoodInventoryFormValues = {
  date: new Date().toISOString().slice(0, 10), item: "", brand: "", amount: "",
}