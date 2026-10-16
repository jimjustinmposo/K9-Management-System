export type ShoppingType = "food" | "others"

export interface ShoppingRecord {
  id: string
  date: string
  type: ShoppingType
  item: string
  brand?: string
  description: string
  quantity: number
  price: number
  food_inventory_id: string | null
  created_by_user_id: string
  created_at: string
  updated_at: string
}

export interface ShoppingFormValues {
  date: string
  type: ShoppingType
  item: string
  brand: string
  description: string
  quantity: string
  price: string
}

export const EMPTY_SHOPPING_FORM: ShoppingFormValues = {
  date: new Date().toISOString().slice(0, 10), type: "food", item: "", brand: "", description: "", quantity: "", price: "",
}