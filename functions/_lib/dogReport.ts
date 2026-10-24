import type { ReportData } from "../../src/types/reports"

type Row = ReportData["rows"][number]
type Source = { title: string; table: string; dogKey?: string; date: string; end?: string; join?: string; fields: [string, string][] }
const sources: Source[] = [
  { title: "Food intake", table: "k9feeding", dogKey: "dog", date: "date", join: "LEFT JOIN k9_handlers h ON h.id=r.handler AND h.workspace_id=r.workspace_id", fields: [["r.date", "Date"], ["r.food", "Food"], ["r.grams", "Intake (g)"], ["h.full_name", "Handler"], ["r.noted", "Notes"]] },
  { title: "Weight", table: "k9weights", dogKey: "dog_id", date: "date", fields: [["r.date", "Date"], ["r.weight", "Weight (kg)"], ["r.difference", "Saved change (kg)"], ["r.nickname", "Recorded nickname"]] },
  { title: "Grooming", table: "k9_grooming", date: "date", fields: [["r.date", "Date"], ["CASE WHEN r.bathing=1 THEN 'Yes' ELSE 'No' END", "Bathing"], ["CASE WHEN r.nails=1 THEN 'Yes' ELSE 'No' END", "Nails"], ["r.ears", "Ears"], ["CASE WHEN r.brushing=1 THEN 'Yes' ELSE 'No' END", "Brushing"], ["r.price", "Charge (currency unspecified)"]] },
  { title: "Health / treatments", table: "k9_medical_records", date: "start_date", end: "end_date", join: "LEFT JOIN k9_medications m ON m.id=r.medication_id AND m.workspace_id=r.workspace_id", fields: [["r.start_date", "Start"], ["r.end_date", "End"], ["m.name", "Medication"], ["m.category", "Category"], ["r.dosage_given", "Dosage"], ["r.administration_method", "Method"], ["r.frequency", "Frequency"], ["r.administered_by", "Administered by"], ["r.notes", "Notes"]] },
  { title: "Health / conditions", table: "k9_medical_conditions", date: "diagnosis_date", fields: [["r.diagnosis_date", "Diagnosis date"], ["r.condition_name", "Condition"], ["r.severity", "Severity"], ["r.notes", "Notes"]] },
  ...["obedience", "detection", "tracking", "protection", "socialization"].map(discipline => ({ title: `Training / ${discipline}`, table: `k9_training_${discipline}`, date: "session_date", join: "LEFT JOIN k9_handlers h ON h.id=r.handler_id AND h.workspace_id=r.workspace_id", fields: [["r.session_date", "Date"], ["h.full_name", "Handler"], ["r.note", "Notes"]] as [string, string][] })),
  { title: "Boarding", table: "boarding_records", date: "check_in_date", end: "check_out_date", fields: [["r.check_in_date", "Check in"], ["r.check_out_date", "Check out"], ["r.status", "Current status"], ["r.owner_name", "Owner"], ["r.owner_phone", "Phone"], ["r.currency", "Currency"], ["r.price_per_day", "Daily rate"], ["r.total_amount", "Full stay charge"], ["r.notes", "Notes"]] },
  { title: "In season", table: "k9_seasons", date: "start_date", end: "end_date", fields: [["r.start_date", "Start"], ["r.end_date", "End"], ["r.status", "Current status"], ["r.notes", "Notes"]] },
  { title: "Legacy linked car trips", table: "k9_car_usage", date: "date", fields: [["r.date", "Date"], ["r.driver", "Driver"], ["r.time_in", "Time in"], ["r.time_out", "Time out"], ["r.km_start", "Start km"], ["r.km_end", "End km"], ["r.km_used", "Distance km"], ["r.notes", "Notes"]] },
]

export class DogReportError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export async function populateDogReport(db: D1Database, ws: string, ids: string[], report: ReportData) {
  if (ids.length > 90 || ids.some(id => !id.trim() || id.length > 200)) throw new DogReportError("Select up to 90 valid dogs per report.", 400)
  const unique = [...new Set(ids)]
  const filter = unique.length ? ` AND id IN (${unique.map(() => "?").join(",")})` : ""
  const dogs = (await db.prepare(`SELECT id, dog_name, nick_name, breed, date_of_birth, sex, status, microchip_number, father_sire, mother_dam, notes, created_at FROM k9_roster WHERE workspace_id=?${filter} ORDER BY dog_name, id LIMIT 101`).bind(ws, ...unique).all<Row>()).results
  if (dogs.length > 90) throw new DogReportError("Select up to 90 dogs instead of all dogs.", 422)
  if (unique.length && dogs.length !== unique.length) throw new DogReportError("One or more selected dogs are unavailable in this workspace.", 404)
  report.title = "Dog care & activity report"
  report.note = "Current profiles plus recorded activity in the selected period. Stays, treatments and seasons include overlapping dates; blank end dates are treated as open-ended, not proof of ongoing treatment. Conditions use diagnosis date. Profiles and statuses are current, not historical. Only saved dog-linked car trips are included. Charges are not payment receipts."
  report.columns = [{ key: "dog", label: "Dog" }, { key: "id", label: "Dog ID" }, { key: "records", label: "Activity records" }, { key: "intake", label: "Food intake (kg)" }]
  report.rows = dogs.map(dog => ({ dog: dog.dog_name, id: dog.id, records: 0, intake: 0 }))
  report.sections = []
  const grouped = new Map<string, NonNullable<ReportData["sections"]>>()
  const profiles: [string, string][] = [["dog_name", "Name"], ["nick_name", "Nickname"], ["breed", "Breed"], ["date_of_birth", "Born"], ["sex", "Sex"], ["status", "Current status"], ["microchip_number", "Microchip"], ["father_sire", "Father / sire"], ["mother_dam", "Mother / dam"], ["notes", "Notes"], ["created_at", "Registered"]]
  let count = 0
  for (const dog of dogs) {
    grouped.set(String(dog.id), [{ title: `${dog.dog_name} / Current profile`, note: `Dog ID: ${dog.id}. Current information, independent of the activity period.`, columns: [{ key: "field", label: "Field" }, { key: "value", label: "Value" }], rows: profiles.map(([field, label]) => ({ field: label, value: dog[field] })) }])
  }
  if (dogs.length) for (const source of sources) {
    // Source identifiers are fixed above, never supplied by the client. Dates and IDs are bound.
    const dateFilter = source.end ? `r.${source.date} <= ? AND (r.${source.end} >= ? OR r.${source.end}='' OR r.${source.end} IS NULL)` : `r.${source.date} >= ? AND r.${source.date} <= ?`
    const dates = source.end ? [report.end, report.start] : [report.start, report.end]
    const rows = (await db.prepare(`SELECT r.${source.dogKey ?? "k9_id"} AS dog_id, ${source.fields.map(([field], index) => `${field} AS c${index}`).join(", ")} FROM ${source.table} r ${source.join ?? ""} WHERE r.workspace_id=? AND r.${source.dogKey ?? "k9_id"} IN (${dogs.map(() => "?").join(",")}) AND ${dateFilter} ORDER BY r.${source.date}, r.id LIMIT ?`).bind(ws, ...dogs.map(dog => dog.id), ...dates, 5001 - count).all<Row>()).results
    count += rows.length
    if (count > 5000) throw new DogReportError("This report exceeds 5,000 activity records. Select fewer dogs or a shorter period; no partial report was generated.", 422)
    for (const dog of dogs) {
      const records = rows.filter(row => row.dog_id === dog.id)
      const summary = report.rows.find(row => row.id === dog.id)!
      summary.records = Number(summary.records) + records.length
      if (source.title === "Food intake") summary.intake = records.reduce((total, row) => total + Number(row.c2 ?? 0), 0) / 1000
      grouped.get(String(dog.id))!.push({ title: `${dog.dog_name} / ${source.title}`, note: `Dog ID: ${dog.id}. ${source.end ? "Records overlapping the selected period; full recorded amounts are not prorated." : "Records dated within the selected period."}`, columns: source.fields.map(([, label], index) => ({ key: `c${index}`, label })), rows: records })
    }
  }
  // Keep all sections for each dog together for preview and export.
  report.sections = [...grouped.values()].flat()
  report.totals = [{ label: "Dogs", value: String(dogs.length) }, { label: "Activity records", value: String(count) }, { label: "Food intake (kg)", value: report.rows.reduce((total, row) => total + Number(row.intake), 0).toFixed(3) }]
}