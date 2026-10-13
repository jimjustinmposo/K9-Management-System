import { apiRequest } from "./auth"
import type { MedicalCondition, MedicalConditionForm, MedicalRecord, MedicalRecordForm, Medication, MedicationForm } from "../types/medical"

async function list<T>(path: string): Promise<T[]> {
  const response = await apiRequest(path)
  return response.data ?? []
}
async function listForK9<T>(path: string, k9Id: string, limit: number, offset: number): Promise<{ data: T[]; total: number }> {
  const params = new URLSearchParams({ k9_id: k9Id, limit: String(limit), offset: String(offset) })
  const response = await apiRequest(`${path}?${params.toString()}`)
  return { data: response.data ?? [], total: Number(response.total ?? 0) }
}
async function save<T>(path: string, method: "POST" | "PUT", data: unknown): Promise<T> {
  const response = await apiRequest(path, { method, body: JSON.stringify(data) })
  return response.data
}
async function remove(path: string): Promise<void> { await apiRequest(path, { method: "DELETE" }) }

export const medicalApi = {
  page: async <T,>(path: string, search: string, limit: number, offset: number): Promise<{ data: T[]; total: number }> => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (search.trim()) params.set("search", search.trim())
    const response = await apiRequest(`${path}?${params.toString()}`)
    return { data: response.data ?? [], total: Number(response.total ?? 0) }
  },
  medications: {
    list: (search = "") => list<Medication>(`/api/medical/medications${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    get: async (id: string) => (await apiRequest(`/api/medical/medications/${encodeURIComponent(id)}`)).data as Medication,
    create: (value: MedicationForm) => save<Medication>("/api/medical/medications", "POST", value),
    update: (id: string, value: MedicationForm) => save<Medication>(`/api/medical/medications/${encodeURIComponent(id)}`, "PUT", value),
    remove: (id: string) => remove(`/api/medical/medications/${encodeURIComponent(id)}`),
  },
  records: {
    list: () => list<MedicalRecord>("/api/medical/records"),
    listForK9: (k9Id: string, limit: number, offset: number) => listForK9<MedicalRecord>("/api/medical/records", k9Id, limit, offset),
    get: async (id: string) => (await apiRequest(`/api/medical/records/${encodeURIComponent(id)}`)).data as MedicalRecord,
    create: (value: MedicalRecordForm) => save<MedicalRecord>("/api/medical/records", "POST", value),
    update: (id: string, value: MedicalRecordForm) => save<MedicalRecord>(`/api/medical/records/${encodeURIComponent(id)}`, "PUT", value),
    remove: (id: string) => remove(`/api/medical/records/${encodeURIComponent(id)}`),
  },
  conditions: {
    list: () => list<MedicalCondition>("/api/medical/conditions"),
    listForK9: (k9Id: string, limit: number, offset: number) => listForK9<MedicalCondition>("/api/medical/conditions", k9Id, limit, offset),
    get: async (id: string) => (await apiRequest(`/api/medical/conditions/${encodeURIComponent(id)}`)).data as MedicalCondition,
    create: (value: MedicalConditionForm) => save<MedicalCondition>("/api/medical/conditions", "POST", value),
    update: (id: string, value: MedicalConditionForm) => save<MedicalCondition>(`/api/medical/conditions/${encodeURIComponent(id)}`, "PUT", value),
    remove: (id: string) => remove(`/api/medical/conditions/${encodeURIComponent(id)}`),
  },
}