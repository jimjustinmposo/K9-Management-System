import type { K9Record } from "./k9"

export const MEDICATION_CATEGORIES = ["Antibiotic", "Pain Relief", "Vaccine", "Dewormer", "Supplement", "Preventive", "Other"] as const
export const ADMINISTRATION_METHODS = ["Oral", "Injection", "Topical", "Ophthalmic", "Otic", "Other"] as const
export const MEDICATION_FREQUENCIES = ["Single dose", "Once daily", "Twice daily", "Every 8 hours", "Every 12 hours", "Weekly", "As needed"] as const
export const CONDITION_SEVERITIES = ["Low", "Moderate", "High", "Critical"] as const

export interface Medication {
  id: string; name: string; category: string; description: string; dosage_guideline: string; created_at: string; updated_at: string
}
export interface MedicalRecord {
  id: string; k9_id: string; medication_id: string; dosage_given: string; administration_method: string; frequency: string
  start_date: string; end_date: string; administered_by: string; notes: string; created_at: string; updated_at: string
  dog_name: string; nick_name: string; breed: string; medication_name: string; medication_category: string
}
export interface MedicalCondition {
  id: string; k9_id: string; condition_name: string; diagnosis_date: string; severity: string; notes: string
  created_at: string; updated_at: string; dog_name: string; nick_name: string; breed: string
}
export type MedicationForm = Pick<Medication, "name" | "category" | "description" | "dosage_guideline">
export type MedicalRecordForm = Pick<MedicalRecord, "k9_id" | "medication_id" | "dosage_given" | "administration_method" | "frequency" | "start_date" | "end_date" | "administered_by" | "notes">
export type MedicalConditionForm = Pick<MedicalCondition, "k9_id" | "condition_name" | "diagnosis_date" | "severity" | "notes">
export type MedicalK9 = Pick<K9Record, "id" | "dogName" | "nickName" | "breed">

export const EMPTY_MEDICATION: MedicationForm = { name: "", category: "Other", description: "", dosage_guideline: "" }
export const EMPTY_MEDICAL_RECORD: MedicalRecordForm = { k9_id: "", medication_id: "", dosage_given: "", administration_method: "Oral", frequency: "Once daily", start_date: new Date().toISOString().slice(0, 10), end_date: "", administered_by: "", notes: "" }
export const EMPTY_MEDICAL_CONDITION: MedicalConditionForm = { k9_id: "", condition_name: "", diagnosis_date: new Date().toISOString().slice(0, 10), severity: "Moderate", notes: "" }