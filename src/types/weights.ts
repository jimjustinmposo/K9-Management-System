export interface WeightRecord {
  id: string
  date: string
  dog_id: string
  nickname: string
  weight: number
  difference: number | null
  dog_name: string
  created_at: string
  updated_at: string
}

export interface WeightInput {
  dog_id: string
  nickname: string
  weight: string
}