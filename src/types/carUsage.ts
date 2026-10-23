export interface CarUsageRecord {
  id: string
  notes: string
  date: string
  driver: string
  timeIn: string
  kmStart: number
  timeOut: string
  kmEnd: number
  kmUsed: number
  createdAt: string
  updatedAt: string
}

export interface CarUsageFormValues {
  notes: string
  date: string
  driver: string
  timeIn: string
  kmStart: string
  timeOut: string
  kmEnd: string
}

export const EMPTY_CAR_USAGE_FORM: CarUsageFormValues = {
  notes: "",
  date: new Date().toISOString().slice(0, 10),
  driver: "",
  timeIn: "",
  kmStart: "",
  timeOut: "",
  kmEnd: "",
}