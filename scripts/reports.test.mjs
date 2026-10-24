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
function setup(role = "owner") {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE k9_roster (id TEXT, workspace_id TEXT, dog_name TEXT, breed TEXT, sex TEXT, date_of_birth TEXT, status TEXT, microchip_number TEXT, created_at TEXT);
    CREATE TABLE k9feeding (workspace_id TEXT, date TEXT, food TEXT, grams REAL, dog TEXT);
    CREATE TABLE k9_food_inventory (id TEXT, workspace_id TEXT, item TEXT, amount REAL);
    CREATE TABLE k9_shopping (id TEXT, workspace_id TEXT, date TEXT, type TEXT, item TEXT, quantity REAL, price REAL, food_inventory_id TEXT);
    CREATE TABLE k9_car_usage (id TEXT, workspace_id TEXT, date TEXT, driver TEXT, time_in TEXT, time_out TEXT, km_start REAL, km_end REAL, km_used REAL, notes TEXT);
    CREATE TABLE boarding_records (workspace_id TEXT, k9_id TEXT, check_out_date TEXT, currency TEXT, total_amount REAL, status TEXT);
    CREATE TABLE k9_grooming (workspace_id TEXT, k9_id TEXT, date TEXT, price REAL);`);
  const auth = { requireSession: async () => role === null ? new Response(null, { status: 401 }) : { role, workspace: { id: "a", name: "Test workspace" } }, isResponse: value => value instanceof Response };
  const api = load("../functions/api/reports/[type].ts", { "../../_lib/auth": auth, "../../_lib/http": { json: (body, status = 200) => Response.json(body, { status }) }, "../../../src/types/reports": types });
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
    INSERT INTO k9feeding VALUES ('a','2026-09-01','Kibble',1000,'dog'),('a','2026-10-01','Kibble',2000,'dog'),('b','2026-10-01','Kibble',999000,'dog');
    INSERT INTO k9_shopping VALUES ('s','a','2026-10-31','food','Kibble',3,4.5,'i'),('x','b','2026-10-31','food','Kibble',99,99,'j');`);
  const food = (await (await get("food")).json()).data;
  assert.equal(food.rows.length, 1); assert.equal(food.rows[0].used, 2); assert.equal(food.rows[0].remaining, 17); assert.equal(food.rows[0].purchased, 3);
  const stock = (await (await get("stock")).json()).data;
  assert.equal(stock.rows.length, 1); assert.equal(stock.rows[0].cost, 13.5); assert.equal(stock.totals[1].value, "13.50");
});
test("sales excludes open stays and separates currencies and services", async () => {
  const { db, get } = setup();
  db.exec(`INSERT INTO boarding_records VALUES ('a','dog','2026-10-01','USD',10,'Checked Out'),('a','dog','2026-10-31','EUR',20,'Checked Out'),('a','dog','2026-10-02','USD',999,'Boarding'),('b','dog','2026-10-01','USD',999,'Checked Out');
    INSERT INTO k9_grooming VALUES ('a','dog','2026-10-31',7.25),('a','dog','2026-11-01',999);`);
  const report = (await (await get("sales")).json()).data;
  assert.equal(report.rows.length, 3);
  assert.equal(report.totals.find(total => total.label === "Boarding / USD").value, "10.00");
  assert.equal(report.totals.find(total => total.label === "Grooming / Unspecified").value, "7.25");
});
test("dog registration includes the last millisecond and excludes next month", async () => {
  const { db, get } = setup();
  for (const [id, ws, date] of [["1","a","2026-10-31T23:59:59.999Z"],["2","a","2026-11-01T00:00:00.000Z"],["3","b","2026-10-01T00:00:00.000Z"]]) db.prepare("INSERT INTO k9_roster VALUES (?,?,'Rex','Breed','Male','','Active','',?)").run(id, ws, date);
  assert.equal((await (await get("dogs")).json()).data.rows.length, 1);
});
test("car totals and over-limit guard", async () => {
  const { db, get } = setup();
  db.exec("INSERT INTO k9_car_usage VALUES ('1','a','2026-10-01','Driver','08:00','09:00',100,112.5,12.5,'Test')");
  assert.equal((await (await get("car")).json()).data.totals[1].value, "12.50");
  db.exec("WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<5001) INSERT INTO k9_grooming SELECT 'a','dog','2026-10-01',1 FROM n");
  assert.equal((await get("sales")).status, 422);
});
test("PDF includes full table, totals, page numbers, and rejects unsupported text", () => {
  const { buildReportPdf } = load("../src/lib/reportPdf.ts");
  const report = { title: "Car report", workspace: "Test", start: "2026-10-01", end: "2026-10-31", generatedAt: "2026-10-24", note: "Test report", columns: [{ key: "name", label: "Name" }], rows: Array.from({ length: 150 }, (_, index) => ({ name: `Trip-${index}` })), totals: [{ label: "Trips", value: "150" }] };
  const doc = buildReportPdf([report]); const output = doc.output();
  assert.ok(doc.getNumberOfPages() > 1); assert.ok(output.includes("Trip-149")); assert.ok(output.includes("Page 1 of")); assert.ok(output.includes("150"));
  assert.throws(() => buildReportPdf([{ ...report, workspace: "犬" }]), /Print/);
});