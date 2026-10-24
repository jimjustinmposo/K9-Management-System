import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(path, overrides = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function("require", "exports", code)(name => overrides[name] ?? require(name), exports);
  return exports;
}
const types = load("../src/types/reports.ts");
const dogReport = load("../functions/_lib/dogReport.ts");
function setup(role = "owner") {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE k9_roster (id TEXT, workspace_id TEXT, dog_name TEXT, breed TEXT, sex TEXT, date_of_birth TEXT, status TEXT, microchip_number TEXT, created_at TEXT);
    CREATE TABLE k9feeding (workspace_id TEXT, date TEXT, food TEXT, grams REAL, dog TEXT);
    CREATE TABLE k9_food_inventory (id TEXT, workspace_id TEXT, item TEXT, amount REAL);
    CREATE TABLE k9_shopping (id TEXT, workspace_id TEXT, date TEXT, type TEXT, item TEXT, quantity REAL, price REAL, food_inventory_id TEXT);
    CREATE TABLE k9_car_usage (id TEXT, workspace_id TEXT, date TEXT, driver TEXT, time_in TEXT, time_out TEXT, km_start REAL, km_end REAL, km_used REAL, notes TEXT);
    CREATE TABLE boarding_records (workspace_id TEXT, k9_id TEXT, check_out_date TEXT, currency TEXT, total_amount REAL, status TEXT);
    CREATE TABLE k9_grooming (workspace_id TEXT, k9_id TEXT, date TEXT, price REAL);`);
  for (const [table, fields] of Object.entries({
    k9_roster: ["nick_name", "father_sire", "mother_dam", "notes"],
    k9feeding: ["id", "handler", "noted"],
    k9_grooming: ["id", "bathing", "nails", "ears", "brushing"],
    boarding_records: ["id", "check_in_date", "owner_name", "owner_phone", "price_per_day", "notes"],
    k9_car_usage: ["k9_id"],
  })) for (const field of fields) db.exec(`ALTER TABLE ${table} ADD COLUMN ${field} TEXT DEFAULT ''`);
  db.exec(`CREATE TABLE k9_handlers (id TEXT, workspace_id TEXT, full_name TEXT);
    CREATE TABLE k9weights (id TEXT, workspace_id TEXT, dog_id TEXT, date TEXT, weight REAL, difference REAL, nickname TEXT);
    CREATE TABLE k9_medications (id TEXT, workspace_id TEXT, name TEXT, category TEXT);
    CREATE TABLE k9_medical_records (id TEXT, workspace_id TEXT, k9_id TEXT, start_date TEXT, end_date TEXT, medication_id TEXT, dosage_given TEXT, administration_method TEXT, frequency TEXT, administered_by TEXT, notes TEXT);
    CREATE TABLE k9_medical_conditions (id TEXT, workspace_id TEXT, k9_id TEXT, diagnosis_date TEXT, condition_name TEXT, severity TEXT, notes TEXT);
    CREATE TABLE k9_seasons (id TEXT, workspace_id TEXT, k9_id TEXT, start_date TEXT, end_date TEXT, status TEXT, notes TEXT);`);
  for (const discipline of ["obedience", "detection", "tracking", "protection", "socialization"]) db.exec(`CREATE TABLE k9_training_${discipline} (id TEXT, workspace_id TEXT, k9_id TEXT, handler_id TEXT, session_date TEXT, note TEXT)`);
  const auth = { requireSession: async () => role === null ? new Response(null, { status: 401 }) : { role, workspace: { id: "a", name: "Test workspace" } }, isResponse: value => value instanceof Response };
  const api = load("../functions/api/reports/[type].ts", { "../../_lib/dogReport": dogReport, "../../_lib/auth": auth, "../../_lib/http": { json: (body, status = 200) => Response.json(body, { status }) }, "../../../src/types/reports": types });
  const DB = { prepare: sql => ({ bind: (...values) => ({ all: async () => ({ results: db.prepare(sql).all(...values) }) }) }) };
  return { db, get: (type, query = "period=monthly&date=2026-10-24") => api.onRequestGet({ request: new Request(`https://test/api/reports/${type}?${query}`), params: { type }, env: { DB } }) };
}
test("period boundaries and invalid dates", () => {
  assert.deepEqual(types.reportRange("weekly", "2026-01-01"), { start: "2025-12-29", end: "2026-01-04" });
  assert.deepEqual(types.reportRange("monthly", "2024-02-29"), { start: "2024-02-01", end: "2024-02-29" });
  assert.deepEqual(types.reportRange("yearly", "2026-10-24"), { start: "2026-01-01", end: "2026-12-31" });
  assert.deepEqual(types.reportRange("daily", "2026-10-24"), { start: "2026-10-24", end: "2026-10-24" });
  for (const date of ["2026-02-30", "", "2026-13-01"]) assert.throws(() => types.reportRange("daily", date));
});
test("authorization, invalid inputs, and empty reports", async () => {
  for (const type of types.REPORT_TYPES) {
    assert.equal((await setup("member").get(type)).status, 403);
    assert.equal((await setup(null).get(type)).status, 401);
    const response = await setup().get(type);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual((await response.json()).data.rows, []);
  }
  assert.equal((await setup().get("bad")).status, 404);
  assert.equal((await setup().get("food", "period=bad&date=2026-10-24")).status, 400);
});
test("food and shopping use workspace-isolated period totals and current balance", async () => {
  const { db, get } = setup();
  db.exec(`INSERT INTO k9_food_inventory VALUES ('i','a','Kibble',20),('j','b','Kibble',999);
    INSERT INTO k9feeding (workspace_id,date,food,grams,dog) VALUES ('a','2026-09-01','Kibble',1000,'dog'),('a','2026-10-01','Kibble',2000,'dog'),('b','2026-10-01','Kibble',999000,'dog');
    INSERT INTO k9_shopping VALUES ('s','a','2026-10-31','food','Kibble',3,4.5,'i'),('x','b','2026-10-31','food','Kibble',99,99,'j');`);
  const food = (await (await get("food")).json()).data;
  assert.equal(food.rows.length, 1); assert.equal(food.rows[0].used, 2); assert.equal(food.rows[0].remaining, 17); assert.equal(food.rows[0].purchased, 3);
  const stock = (await (await get("stock")).json()).data;
  assert.equal(stock.rows.length, 1); assert.equal(stock.rows[0].cost, 13.5); assert.equal(stock.totals[1].value, "13.50");
});
test("sales excludes open stays and separates currencies and services", async () => {
  const { db, get } = setup();
  db.exec(`INSERT INTO boarding_records (workspace_id,k9_id,check_out_date,currency,total_amount,status) VALUES ('a','dog','2026-10-01','USD',10,'Checked Out'),('a','dog','2026-10-31','EUR',20,'Checked Out'),('a','dog','2026-10-02','USD',999,'Boarding'),('b','dog','2026-10-01','USD',999,'Checked Out');
    INSERT INTO k9_grooming (workspace_id,k9_id,date,price) VALUES ('a','dog','2026-10-31',7.25),('a','dog','2026-11-01',999);`);
  const report = (await (await get("sales")).json()).data;
  assert.equal(report.rows.length, 3);
  assert.equal(report.totals.find(total => total.label === "Boarding / USD").value, "10.00");
  assert.equal(report.totals.find(total => total.label === "Grooming / Unspecified").value, "7.25");
});
test("dog profiles are current and independent of registration date", async () => {
  const { db, get } = setup();
  for (const [id, ws, date] of [["1","a","2026-10-31T23:59:59.999Z"],["2","a","2025-01-01T00:00:00.000Z"],["3","b","2026-10-01T00:00:00.000Z"]]) db.prepare("INSERT INTO k9_roster (id,workspace_id,dog_name,breed,sex,date_of_birth,status,microchip_number,created_at) VALUES (?,?,'Rex','Breed','Male','','Active','',?)").run(id, ws, date);
  const response = await get("dogs"); assert.equal(response.status, 200);
  assert.equal((await response.json()).data.rows.length, 2);
});
test("car totals and over-limit guard", async () => {
  const { db, get } = setup();
  db.exec("INSERT INTO k9_car_usage (id,workspace_id,date,driver,time_in,time_out,km_start,km_end,km_used,notes) VALUES ('1','a','2026-10-01','Driver','08:00','09:00',100,112.5,12.5,'Test')");
  assert.equal((await (await get("car")).json()).data.totals[1].value, "12.50");
  db.exec("WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<5001) INSERT INTO k9_grooming (workspace_id,k9_id,date,price) SELECT 'a','dog','2026-10-01',1 FROM n");
  assert.equal((await get("sales")).status, 422);
});
test("PDF includes full table, totals, page numbers, and rejects unsupported text", () => {
  const { buildReportPdf } = load("../src/lib/reportPdf.ts", { "../types/reports": types });
  const report = { title: "Car report", workspace: "Test", start: "2026-10-01", end: "2026-10-31", generatedAt: "2026-10-24", note: "Test report", columns: [{ key: "name", label: "Name" }], rows: Array.from({ length: 150 }, (_, index) => ({ name: `Trip-${index}` })), totals: [{ label: "Trips", value: "150" }] };
  const doc = buildReportPdf([report]); const output = doc.output();
  assert.ok(doc.getNumberOfPages() > 1); assert.ok(output.includes("Trip-149")); assert.ok(output.includes("Page 1 of")); assert.ok(output.includes("150"));
  assert.throws(() => buildReportPdf([{ ...report, workspace: "犬" }]), /Print/);
});

test("selected dogs include every care category, overlap dates, and never other dogs/workspaces", async () => {
  const { db, get } = setup();
  db.exec(`INSERT INTO k9_roster (id,workspace_id,dog_name,created_at) VALUES ('h','a','Hilda','2020-01-01'),('r','a','Rex','2020-01-01'),('x','b','Private','2020-01-01');
    INSERT INTO k9feeding (id,workspace_id,dog,date,food,grams) VALUES ('f','a','h','2026-10-01','Kibble',500),('f2','a','r','2026-10-01','Kibble',1000),('f3','b','h','2026-10-01','Private',9000),('f4','a','h','2026-11-01','Outside',9000);
    INSERT INTO k9weights VALUES ('w','a','h','2026-10-31',25,1,'Hilda');
    INSERT INTO k9_grooming (id,workspace_id,k9_id,date,price,bathing,nails,brushing,ears) VALUES ('g','a','h','2026-10-15',12,1,1,0,'Clean');
    INSERT INTO k9_medications VALUES ('m','a','Vaccine','Vaccine');
    INSERT INTO k9_medical_records VALUES ('m1','a','h','2026-09-25','2026-10-02','m','1 ml','Injection','Single dose','Vet','Treatment note');
    INSERT INTO k9_medical_conditions VALUES ('c','a','h','2026-10-03','Condition','Low','Condition note');
    INSERT INTO boarding_records (id,workspace_id,k9_id,check_in_date,check_out_date,status,total_amount) VALUES ('b','a','h','2026-09-25','2026-10-02','Checked Out',30),('outside','a','h','2026-08-01','2026-09-30','Checked Out',50);
    INSERT INTO k9_seasons VALUES ('s','a','h','2026-09-29','','Active','Season note');
    INSERT INTO k9_car_usage (id,workspace_id,k9_id,date,notes) VALUES ('car','a','h','2026-10-04','Linked'),('unlinked','a',NULL,'2026-10-04','Hilda');`);
  for (const discipline of ["obedience", "detection", "tracking", "protection", "socialization"]) db.exec(`INSERT INTO k9_training_${discipline} VALUES ('t','a','h','','2026-10-05','Training note')`);
  const response = await get("dogs", "period=monthly&date=2026-10-24&dog=h");
  assert.equal(response.status, 200);
  const report = (await response.json()).data;
  assert.equal(report.rows.length, 1); assert.equal(report.rows[0].records, 13); assert.equal(report.rows[0].intake, 0.5);
  assert.equal(report.sections.length, 14);
  for (const section of report.sections.slice(1)) assert.equal(section.rows.length, 1, section.title);
  assert.ok(!JSON.stringify(report).includes('Private')); assert.ok(!JSON.stringify(report).includes('Outside'));
  const multiple = (await (await get("dogs", "period=monthly&date=2026-10-24&dog=h&dog=r&dog=h")).json()).data;
  assert.equal(multiple.rows.length, 2); assert.equal(multiple.totals[1].value, "14");
  assert.equal((await get("dogs", "period=monthly&date=2026-10-24&dog=x")).status, 404);
  assert.equal((await get("dogs", "period=monthly&date=2026-10-24&dog=")).status, 400);
  const { buildReportPdf } = load("../src/lib/reportPdf.ts", { "../types/reports": types });
  const output = buildReportPdf([report]).output();
  assert.ok(output.includes("Hilda")); assert.ok(output.includes("Treatment note")); assert.ok(output.includes("Season note"));
});

test("dog report rejects oversized activity instead of exporting a partial history", async () => {
  const { db, get } = setup();
  db.exec(`INSERT INTO k9_roster (id,workspace_id,dog_name) VALUES ('h','a','Hilda');
    WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<5001) INSERT INTO k9feeding (id,workspace_id,dog,date,grams) SELECT x,'a','h','2026-10-01',1 FROM n;`);
  assert.equal((await get("dogs")).status, 422);
});