export interface GroomingRecord {
  id: string
  k9Id: string
  dogName: string
  nickName: string
  date: string
  bathing: boolean
  nails: boolean
  ears: string
  brushing: boolean
  price: number
  createdAt: string
  updatedAt: string
}

export interface GroomingFormValues {
  k9Id: string
  date: string
  bathing: boolean
  nails: boolean
  ears: string
  brushing: boolean
  price: string
}

export const EMPTY_GROOMING_FORM: GroomingFormValues = {
  k9Id: "", date: new Date().toISOString().slice(0, 10), bathing: false, nails: false, ears: "", brushing: false, price: "0",
}