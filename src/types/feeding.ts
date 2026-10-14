export interface FeedingRecord {
  id: string
  date: string
  dog: string
  handler: string
  food: string
  grams: number
  noted: string
  dog_name: string
  handler_name: string
  created_at: string
  updated_at: string
}

export interface FeedingFormValues {
  date: string
  dog: string
  handler: string
  food: string
  grams: string
  unit: "g" | "kg"
  noted: string
}

export const EMPTY_FEEDING_FORM: FeedingFormValues = {
  date: new Date().toISOString().slice(0, 10), dog: "", handler: "", food: "", grams: "", unit: "g", noted: "",
}