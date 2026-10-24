import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"
import { REPORT_TYPES, reportRange, type ReportData, type ReportPeriod, type ReportType } from "../../../src/types/reports"

type Row = ReportData["rows"][number]
const columns = (pairs: string[][]) => pairs.map(([key, label]) => ({ key, label }))
export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session
  if (session.role !== "owner") return json({ error: "Reports are available to workspace owners only." }, 403)
  const type = context.params.type as ReportType
  if (!REPORT_TYPES.includes(type)) return json({ error: "Report not found." }, 404)
  const params = new URL(context.request.url).searchParams
  let range: { start: string; end: string }
  try { range = reportRange(params.get("period") as ReportPeriod, params.get("date") ?? "") }
  catch { return json({ error: "Invalid report period or reference date." }, 400) }
  const { start, end } = range
  const ws = session.workspace.id
  const report: ReportData = { type, title: "", start, end, generatedAt: new Date().toISOString(), workspace: session.workspace.name, note: "", columns: [], rows: [], totals: [] }
  let sql = ""
  let bindings: (string | number)[] = [ws, start, end]
  if (type === "food") {
    report.title = "Food report"
    report.note = "Purchased and consumed quantities cover the selected period. Remaining stock is CURRENT, not a historical balance. Food names are matched case-insensitively and duplicate inventory names are combined. Low stock means 5 kg or less. Manual restocks have no dated history."
    report.columns = columns([["item", "Food"], ["feeds", "Feedings"], ["purchased", "Purchased (kg)"], ["used", "Used (kg)"], ["remaining", "Current kg"], ["stock_status", "Current status"]])
    sql = `WITH inventory AS (SELECT LOWER(TRIM(item)) AS name, MIN(item) AS item, SUM(amount) AS amount FROM k9_food_inventory WHERE workspace_id = ? GROUP BY LOWER(TRIM(item))),
      feeds AS (SELECT LOWER(TRIM(food)) AS name, MIN(food) AS item, SUM(grams)/1000.0 AS all_used, SUM(CASE WHEN date >= ? AND date <= ? THEN grams ELSE 0 END)/1000.0 AS used, SUM(CASE WHEN date >= ? AND date <= ? THEN 1 ELSE 0 END) AS feeds FROM k9feeding WHERE workspace_id = ? GROUP BY LOWER(TRIM(food))),
      purchases AS (SELECT LOWER(TRIM(item)) AS name, MIN(item) AS item, SUM(quantity) AS purchased FROM k9_shopping WHERE workspace_id = ? AND date >= ? AND date <= ? AND type = 'food' GROUP BY LOWER(TRIM(item))),
      names AS (SELECT name, item FROM inventory UNION SELECT name, item FROM feeds WHERE feeds > 0 UNION SELECT name, item FROM purchases)
      SELECT MIN(n.item) AS item, COALESCE(f.feeds,0) AS feeds, ROUND(COALESCE(p.purchased,0),3) AS purchased, ROUND(COALESCE(f.used,0),3) AS used, CASE WHEN i.name IS NOT NULL THEN ROUND(i.amount-COALESCE(f.all_used,0),3) END AS remaining
      FROM names n LEFT JOIN inventory i ON i.name=n.name LEFT JOIN feeds f ON f.name=n.name LEFT JOIN purchases p ON p.name=n.name GROUP BY n.name ORDER BY item`
    bindings = [ws, start, end, start, end, ws, ws, start, end]
  } else if (type === "stock") {
    report.title = "Stock & purchases report"
    report.note = "Purchases in the selected period; cost = quantity × unit price. Currency is not recorded. Food quantity is kg; other units are unspecified. Linked remaining stock is CURRENT, not a historical balance; repeated linked balances must not be added. Low-stock threshold: 5 kg. Manual restocks are not purchase history."
    report.columns = columns([["date", "Date"], ["item", "Item"], ["type", "Category"], ["quantity", "Quantity"], ["price", "Unit price"], ["cost", "Cost"], ["inventory", "Linked inventory"], ["remaining", "Current kg"], ["stock_status", "Current status"]])
    sql = `SELECT s.date, s.item, s.type, s.quantity, s.price, ROUND(s.quantity*s.price, 2) AS cost, i.item AS inventory,
      CASE WHEN i.id IS NOT NULL THEN ROUND(i.amount - COALESCE((SELECT SUM(f.grams)/1000.0 FROM k9feeding f WHERE f.workspace_id = i.workspace_id AND LOWER(TRIM(f.food)) = LOWER(TRIM(i.item))), 0), 3) END AS remaining
      FROM k9_shopping s LEFT JOIN k9_food_inventory i ON i.id = s.food_inventory_id AND i.workspace_id = s.workspace_id
      WHERE s.workspace_id = ? AND s.date >= ? AND s.date <= ? ORDER BY s.date, s.id`
  } else if (type === "dogs") {
    report.title = "Dog registrations report"
    report.note = "Dogs registered during the selected period (UTC creation date). Status and identifying details are current, not historical snapshots."
    report.columns = columns([["registered", "Registered"], ["dog_name", "Dog"], ["breed", "Breed"], ["sex", "Sex"], ["date_of_birth", "Born"], ["status", "Current status"], ["microchip_number", "Microchip"]])
    sql = "SELECT substr(created_at,1,10) AS registered, dog_name, breed, sex, date_of_birth, status, microchip_number FROM k9_roster WHERE workspace_id = ? AND created_at >= ? AND created_at < ? ORDER BY created_at, id"
    const nextDay = new Date(`${end}T00:00:00Z`)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)
    bindings = [ws, `${start}T00:00:00`, nextDay.toISOString().slice(0, 10)]
  } else if (type === "car") {
    report.title = "Car usage report"
    report.note = "Trips by recorded trip date; distance uses the saved odometer difference."
    report.columns = columns([["date", "Date"], ["driver", "Driver"], ["time_in", "Time in"], ["time_out", "Time out"], ["km_start", "Start km"], ["km_end", "End km"], ["km_used", "Distance km"], ["notes", "Notes"]])
    sql = "SELECT date, driver, time_in, time_out, km_start, km_end, km_used, notes FROM k9_car_usage WHERE workspace_id = ? AND date >= ? AND date <= ? ORDER BY date, id"
  } else {
    report.title = "Sales / service charges report"
    report.note = "Recorded charges, NOT paid revenue. Boarding includes checked-out stays by checkout date and saved total; grooming uses service date. Grooming currency is not recorded and is kept separate. Missing boarding totals are excluded from charge totals."
    report.columns = columns([["date", "Date"], ["service", "Service"], ["dog", "Dog"], ["currency", "Currency"], ["amount", "Charge"]])
    sql = `SELECT b.check_out_date AS date, 'Boarding' AS service, k.dog_name AS dog, b.currency, b.total_amount AS amount FROM boarding_records b LEFT JOIN k9_roster k ON k.id = b.k9_id AND k.workspace_id = b.workspace_id WHERE b.workspace_id = ? AND b.check_out_date >= ? AND b.check_out_date <= ? AND b.status = 'Checked Out'
      UNION ALL SELECT g.date, 'Grooming', k.dog_name, 'Unspecified', g.price FROM k9_grooming g LEFT JOIN k9_roster k ON k.id = g.k9_id AND k.workspace_id = g.workspace_id WHERE g.workspace_id = ? AND g.date >= ? AND g.date <= ? ORDER BY date, service, dog`
    bindings = [ws, start, end, ws, start, end]
  }
  try {
    const result = await context.env.DB.prepare(`${sql} LIMIT 5001`).bind(...bindings).all<Row>()
    if (result.results.length > 5000) return json({ error: "This report exceeds 5,000 rows. Choose a shorter period; no partial report has been generated." }, 422)
    report.rows = result.results
    const sum = (key: string) => report.rows.reduce((total, row) => total + Number(row[key] ?? 0), 0)
    report.totals.push({ label: "Rows", value: String(report.rows.length) })
    if (type === "food") report.totals.push({ label: "Consumed (kg)", value: sum("used").toFixed(3) }, { label: "Purchased (kg)", value: sum("purchased").toFixed(3) }, { label: "Feedings", value: String(sum("feeds")) })
    if (type === "stock" || type === "food") {
      report.rows.forEach(row => { row.stock_status = row.remaining === null ? "Not linked" : Number(row.remaining) <= 0 ? "Out of stock" : Number(row.remaining) <= 5 ? "Low stock" : "In stock" })
      if (type === "stock") report.totals.push({ label: "Purchase cost (currency unspecified)", value: (report.rows.reduce((total, row) => total + Math.round(Number(row.cost) * 100), 0) / 100).toFixed(2) })
    }
    if (type === "car") report.totals.push({ label: "Distance (km)", value: sum("km_used").toFixed(2) }, { label: "Drivers", value: String(new Set(report.rows.map(row => row.driver)).size) })
    if (type === "dogs") for (const status of new Set(report.rows.map(row => String(row.status || "Unspecified")))) report.totals.push({ label: status, value: String(report.rows.filter(row => (row.status || "Unspecified") === status).length) })
    if (type === "sales") {
      const totals = new Map<string, number>()
      for (const row of report.rows) { const key = `${row.service} / ${row.currency || "Unspecified"}`; totals.set(key, (totals.get(key) ?? 0) + Math.round(Number(row.amount ?? 0) * 100)) }
      for (const [label, cents] of totals) report.totals.push({ label, value: (cents / 100).toFixed(2) })
      report.totals.push({ label: "Missing charge amounts", value: String(report.rows.filter(row => row.amount === null).length) })
    }
    const response = json({ data: report })
    response.headers.set("Cache-Control", "private, no-store")
    return response
  } catch { return json({ error: "Unable to load report. Verify the database migrations are applied and try again." }, 500) }
}