import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AppShell, Panel } from "../components/AppShell"
import { k9Api } from "../lib/k9Api"
import { medicalApi } from "../lib/medicalApi"
import { ADMINISTRATION_METHODS, CONDITION_SEVERITIES, EMPTY_MEDICAL_CONDITION, EMPTY_MEDICAL_RECORD, EMPTY_MEDICATION, MEDICATION_CATEGORIES, MEDICATION_FREQUENCIES, type MedicalConditionForm, type MedicalRecordForm, type MedicalK9, type MedicationForm, type Medication } from "../types/medical"

type Kind = "medications" | "records" | "conditions"
const input = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-positive"
const label = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.1em] text-slate"

export default function MedicalFormPage({ kind }: { kind: Kind }) {
  const { id } = useParams<{ id: string }>(), navigate = useNavigate(), editing = Boolean(id)
  const [form, setForm] = useState<MedicationForm | MedicalRecordForm | MedicalConditionForm>(() => kind === "medications" ? { ...EMPTY_MEDICATION } : kind === "records" ? { ...EMPTY_MEDICAL_RECORD } : { ...EMPTY_MEDICAL_CONDITION })
  const [dogs, setDogs] = useState<MedicalK9[]>([]), [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState("")
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (kind === "records" || kind === "conditions") setDogs(await k9Api.list())
        if (kind === "records") setMedications(await medicalApi.medications.list())
        if (id) {
          const record = kind === "medications" ? await medicalApi.medications.get(id) : kind === "records" ? await medicalApi.records.get(id) : await medicalApi.conditions.get(id)
          if (active) {
            if (kind === "medications") { const { name, category, description, dosage_guideline } = record as Medication; setForm({ name, category, description, dosage_guideline }) }
            else if (kind === "records") { const r = record as Awaited<ReturnType<typeof medicalApi.records.get>>; setForm({ k9_id: r.k9_id, medication_id: r.medication_id, dosage_given: r.dosage_given, administration_method: r.administration_method, frequency: r.frequency, start_date: r.start_date, end_date: r.end_date, administered_by: r.administered_by, notes: r.notes }) }
            else { const r = record as Awaited<ReturnType<typeof medicalApi.conditions.get>>; setForm({ k9_id: r.k9_id, condition_name: r.condition_name, diagnosis_date: r.diagnosis_date, severity: r.severity, notes: r.notes }) }
          }
        }
      } catch (err) { if (active) setError(err instanceof Error ? err.message : "Could not load this form.") }
      finally { if (active) setLoading(false) }
    }
    void load(); return () => { active = false }
  }, [id, kind])
  function set(key: string, value: string) { setForm((current) => ({ ...current, [key]: value })) }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setSaving(true)
    try {
      if (kind === "medications") id ? await medicalApi.medications.update(id, form as MedicationForm) : await medicalApi.medications.create(form as MedicationForm)
      else if (kind === "records") id ? await medicalApi.records.update(id, form as MedicalRecordForm) : await medicalApi.records.create(form as MedicalRecordForm)
      else id ? await medicalApi.conditions.update(id, form as MedicalConditionForm) : await medicalApi.conditions.create(form as MedicalConditionForm)
      navigate(`/medical/${kind}`, { replace: true })
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save the medical entry.") }
    finally { setSaving(false) }
  }
  const title = `${editing ? "Edit" : "Add"} ${kind === "medications" ? "Medication" : kind === "records" ? "Treatment Record" : "Condition"}`
  if (loading) return <AppShell title={title}><Panel className="p-8 text-center text-sm text-muted">Loading…</Panel></AppShell>
  return <AppShell title={title}><form onSubmit={(e) => void submit(e)} className="mx-auto max-w-3xl space-y-5">
    <div><Link to={`/medical/${kind}`} className="text-xs font-bold text-positive">← Back to {kind}</Link><p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.18em] text-positive">K9 medical record</p><h2 className="mt-1 font-rajdhani text-3xl font-bold text-ink">{title}</h2></div>
    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
    {kind === "medications" && <Panel className="space-y-4 p-5"><div><label className={label} htmlFor="name">Medication name *</label><input id="name" required maxLength={160} className={input} value={(form as MedicationForm).name} onChange={(e) => set("name", e.target.value)} /></div><div><label className={label} htmlFor="category">Category</label><select id="category" className={input} value={(form as MedicationForm).category} onChange={(e) => set("category", e.target.value)}>{MEDICATION_CATEGORIES.map((x) => <option key={x}>{x}</option>)}</select></div><div><label className={label} htmlFor="description">Description</label><textarea id="description" rows={3} className={input} value={(form as MedicationForm).description} onChange={(e) => set("description", e.target.value)} /></div><div><label className={label} htmlFor="guideline">Dosage guideline</label><textarea id="guideline" rows={3} className={input} value={(form as MedicationForm).dosage_guideline} onChange={(e) => set("dosage_guideline", e.target.value)} placeholder="Reference only; verify with a veterinarian." /></div></Panel>}
    {kind === "records" && <Panel className="grid gap-4 p-5 md:grid-cols-2"><div><label className={label} htmlFor="k9">K9 *</label><select required id="k9" className={input} value={(form as MedicalRecordForm).k9_id} onChange={(e) => set("k9_id", e.target.value)}><option value="">Select a registered K9</option>{dogs.map((dog) => <option key={dog.id} value={dog.id}>{dog.dogName}{dog.nickName ? ` (${dog.nickName})` : ""}</option>)}</select></div><div><label className={label} htmlFor="medication">Medication *</label><select required id="medication" className={input} value={(form as MedicalRecordForm).medication_id} onChange={(e) => set("medication_id", e.target.value)}><option value="">Select medication</option>{medications.map((med) => <option key={med.id} value={med.id}>{med.name}</option>)}</select></div><div><label className={label} htmlFor="dosage">Dosage given *</label><input required id="dosage" maxLength={100} className={input} value={(form as MedicalRecordForm).dosage_given} onChange={(e) => set("dosage_given", e.target.value)} placeholder="e.g. 250 mg" /></div><div><label className={label} htmlFor="method">Administration method *</label><select id="method" className={input} value={(form as MedicalRecordForm).administration_method} onChange={(e) => set("administration_method", e.target.value)}>{ADMINISTRATION_METHODS.map((x) => <option key={x}>{x}</option>)}</select></div><div><label className={label} htmlFor="frequency">Frequency *</label><select id="frequency" className={input} value={(form as MedicalRecordForm).frequency} onChange={(e) => set("frequency", e.target.value)}>{MEDICATION_FREQUENCIES.map((x) => <option key={x}>{x}</option>)}</select></div><div><label className={label} htmlFor="start">Start date *</label><input required type="date" id="start" className={input} value={(form as MedicalRecordForm).start_date} onChange={(e) => set("start_date", e.target.value)} /></div><div><label className={label} htmlFor="end">End date</label><input type="date" id="end" min={(form as MedicalRecordForm).start_date} className={input} value={(form as MedicalRecordForm).end_date} onChange={(e) => set("end_date", e.target.value)} /></div><div><label className={label} htmlFor="admin">Administered by</label><input id="admin" maxLength={120} className={input} value={(form as MedicalRecordForm).administered_by} onChange={(e) => set("administered_by", e.target.value)} /></div><div className="md:col-span-2"><label className={label} htmlFor="notes">Notes</label><textarea id="notes" rows={3} className={input} value={(form as MedicalRecordForm).notes} onChange={(e) => set("notes", e.target.value)} /></div><p className="text-xs text-muted md:col-span-2">Record the veterinarian-directed dose actually given; this form does not recommend dosing.</p></Panel>}
    {kind === "conditions" && <Panel className="grid gap-4 p-5 md:grid-cols-2"><div><label className={label} htmlFor="k9">K9 *</label><select required id="k9" className={input} value={(form as MedicalConditionForm).k9_id} onChange={(e) => set("k9_id", e.target.value)}><option value="">Select a registered K9</option>{dogs.map((dog) => <option key={dog.id} value={dog.id}>{dog.dogName}{dog.nickName ? ` (${dog.nickName})` : ""}</option>)}</select></div><div><label className={label} htmlFor="condition">Condition name *</label><input required maxLength={160} id="condition" className={input} value={(form as MedicalConditionForm).condition_name} onChange={(e) => set("condition_name", e.target.value)} /></div><div><label className={label} htmlFor="diagnosis">Diagnosis date *</label><input required type="date" id="diagnosis" className={input} value={(form as MedicalConditionForm).diagnosis_date} onChange={(e) => set("diagnosis_date", e.target.value)} /></div><div><label className={label} htmlFor="severity">Severity *</label><select id="severity" className={input} value={(form as MedicalConditionForm).severity} onChange={(e) => set("severity", e.target.value)}>{CONDITION_SEVERITIES.map((x) => <option key={x}>{x}</option>)}</select></div><div className="md:col-span-2"><label className={label} htmlFor="notes">Notes</label><textarea id="notes" rows={4} className={input} value={(form as MedicalConditionForm).notes} onChange={(e) => set("notes", e.target.value)} /></div></Panel>}
    <div className="flex justify-end gap-2"><Link to={`/medical/${kind}`} className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-slate">Cancel</Link><button disabled={saving} className="rounded-xl bg-navy px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving…" : editing ? "Save changes" : "Create record"}</button></div>
  </form></AppShell>
}