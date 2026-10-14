import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Run actual handlers with isolated authentication and D1 spies; no network or data writes.
function harness(module, { denied = false, fail = false, total = 27 } = {}) {
  const queries = [];
  const exports = {};
  const source = readFileSync(new URL(`../functions/api/${module}/_lib.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const require = (name) => {
    if (name === "../../_lib/auth") return {
      requireSession: async (_context, permission) => {
        assert.equal(permission, "view");
        return denied ? new Response(null, { status: 401 }) : { workspace: { id: "tenant-a" } };
      },
      isResponse: (value) => value instanceof Response,
    };
    assert.equal(name, "../../_lib/http");
    return { clean: (value) => String(value ?? "").trim(), json: (data, status = 200) => Response.json(data, { status }) };
  };
  new Function("require", "exports", compiled)(require, exports);
  const DB = { prepare(sql) {
    const query = { sql, bindings: [], method: null };
    queries.push(query);
    return {
      bind(...bindings) { query.bindings = bindings; return this; },
      async first() { query.method = "first"; if (fail) throw new Error("private database detail"); return { total }; },
      async all() { query.method = "all"; if (fail) throw new Error("private database detail"); return { results: [{ id: "record-1" }] }; },
    };
  } };
  return { queries, list: (kind, query) => exports.list({ request: new Request(`http://localhost/api/${module}/${kind}?${query}`), params: { discipline: kind }, env: { DB } }, kind) };
}

for (const [module, kinds] of Object.entries({ training: ["obedience", "detection", "tracking", "protection", "socialization"], medical: ["medications", "records", "conditions"] })) {
  for (const kind of kinds) {
    test(`${module}/${kind}: count retains list joins, filters and tenant scope without fetching record payloads`, async () => {
      const filter = kind === "medications" ? "category=Other" : "k9_id=dog-1";
      const normal = harness(module);
      await normal.list(kind, `${filter}&search=needle&limit=10&offset=20`);
      const count = harness(module);
      const response = await count.list(kind, `${filter}&search=needle&count_only=true&limit=10&offset=20`);
      assert.deepEqual(await response.json(), { data: [], total: 27 });
      assert.equal(count.queries.length, 1);
      assert.deepEqual(count.queries[0], normal.queries[1]);
      assert.match(count.queries[0].sql, /workspace_id = \?/);
      assert.equal(count.queries[0].bindings[0], "tenant-a");
      assert.equal(count.queries[0].method, "first");
      assert.doesNotMatch(count.queries[0].sql, /ORDER BY|LIMIT|OFFSET/);
    });
    test(`${module}/${kind}: default list and explicit false retain existing response contracts`, async () => {
      for (const query of ["", "count_only=false"]) {
        const h = harness(module);
        assert.deepEqual(await (await h.list(kind, query)).json(), { data: [{ id: "record-1" }] });
        assert.equal(h.queries.length, 1);
        assert.equal(h.queries[0].method, "all");
      }
      const h = harness(module);
      assert.deepEqual(await (await h.list(kind, "limit=10&offset=20")).json(), { data: [{ id: "record-1" }], total: 27 });
      assert.deepEqual(h.queries[0].bindings, ["tenant-a", 10, 20]);
    });
    test(`${module}/${kind}: authentication, zero counts and sanitized errors`, async () => {
      const denied = harness(module, { denied: true });
      assert.equal((await denied.list(kind, "count_only=true")).status, 401);
      assert.equal(denied.queries.length, 0);
      const empty = harness(module, { total: 0 });
      assert.deepEqual(await (await empty.list(kind, "count_only=true")).json(), { data: [], total: 0 });
      const failed = await harness(module, { fail: true }).list(kind, "count_only=true");
      assert.equal(failed.status, 500);
      assert.doesNotMatch(await failed.text(), /private database detail/);
    });
  }
}

test("invalid training discipline remains 404 without SQL", async () => {
  const h = harness("training");
  assert.equal((await h.list("invalid", "count_only=true")).status, 404);
  assert.equal(h.queries.length, 0);
});