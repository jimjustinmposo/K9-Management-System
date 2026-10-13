export const TRAINING_DISCIPLINES = [
  { id: "obedience", name: "K9 Obedience", description: "Log obedience training sessions." },
  { id: "detection", name: "K9 Detection", description: "Log scent and detection training." },
  { id: "tracking", name: "K9 Tracking", description: "Log trail and tracking training." },
  { id: "protection", name: "K9 Protection", description: "Log protection training sessions." },
  { id: "socialization", name: "K9 Socialization", description: "Log socialization training sessions." },
] as const

export type TrainingDiscipline = typeof TRAINING_DISCIPLINES[number]["id"]
export interface TrainingSession {
  id: string
  k9_id: string
  handler_id: string
  session_date: string
  note: string
  dog_name: string
  handler_name: string
  created_at: string
  updated_at: string
}
export interface TrainingFormValues { k9_id: string; handler_id: string; session_date: string; note: string }
export const EMPTY_TRAINING_FORM: TrainingFormValues = { k9_id: "", handler_id: "", session_date: new Date().toISOString().slice(0, 10), note: "" }

export function isTrainingDiscipline(value: string | undefined): value is TrainingDiscipline {
  return TRAINING_DISCIPLINES.some((discipline) => discipline.id === value)
}