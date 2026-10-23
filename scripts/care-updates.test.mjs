import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { test } from "node:test";

const require = createRequire(import.meta.url);
function endpoint(resource, permission = true, exists = true) {
  const writes = [];
  const source = readFileSync(new URL(`../functions/api/${resource}/[id].ts`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  const auth = { requireSession: async (_, requested) => {
    assert.equal(requested, "create");
    return permission ? { workspace: { id: "workspace-a" } } : new Response(null, { status: 403 });
  }, isResponse: (value) => value instanceof Response };
  new Function("require", "exports", code)((name) => name.endsWith("/auth") ? auth : name.endsWith("/http") ? { clean: (value) => typeof value === "string" ? value.trim() : "", json: (body, status = 200) => Response.json(body, { status }) } : require(name), exports);
  const DB = { prepare(sql) { return { bind(...values) {
    assert.equal(values.at(-1), "workspace-a");
    return { first: async () => exists ? { id: "record", check_in_date: "2026-01-01", price_per_day: 10 } : null,
      run: async () => { writes.push({ sql, values }); return { meta: { changes: exists ? 1 : 0 } }; } };
  } }; } };
  return { writes, patch: (body) => exports.onRequestPatch({ request: new Request("https://example.test/api", { method: "PATCH", body: JSON.stringify(body) }), params: { id: "record" }, env: { DB } }) };
}

test("boarding member checkbox recalculates total without editing price or owner", async () => {
  const api = endpoint("boarding");
  assert.equal((await api.patch({ status: "Checked Out", check_out_date: "2026-01-03" })).status, 200);
  assert.equal(api.writes[0].values[2], 30);
  assert.equal((await api.patch({ status: "Boarding", price_per_day: 0 })).status, 400);
  assert.equal((await api.patch({ status: "Checked Out", check_out_date: "2026-02-30" })).status, 400);
  assert.equal((await api.patch({ status: "Boarding" })).status, 200);
  assert.equal(api.writes[1].values[2], null);
});
test("grooming only accepts one boolean care field", async () => {
  const api = endpoint("grooming");
  for (const field of ["bathing", "nails", "brushing"]) {
    assert.equal((await api.patch({ [field]: true })).status, 200);
    assert.equal((await api.patch({ [field]: false })).status, 200);
  }
  for (const body of [{ price: 0 }, { bathing: "true" }, { bathing: true, ears: "changed" }, {}]) assert.equal((await api.patch(body)).status, 400);
});
test("both checkbox endpoints respect denied permission and workspace misses", async () => {
  for (const [resource, body] of [["boarding", { status: "Boarding" }], ["grooming", { bathing: true }]]) {
    assert.equal((await endpoint(resource, false).patch(body)).status, 403);
    assert.equal((await endpoint(resource, true, false).patch(body)).status, 404);
  }
});