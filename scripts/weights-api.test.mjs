import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadModule(path, modules) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function("require", "exports", compiled)((name) => {
    assert.ok(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  }, exports);
  return exports;
}

function handlerHarness({ denied = false, fail = false, rows = [{ id: "weight-1", dog_id: "dog-a", weight: 32.5 }], total = 1 } = {}) {
  const queries = [];
  const module = loadModule("../functions/api/weights/index.ts", {
    "../../_lib/auth": {
      requireSession: async (_context, permission) => {
        assert.equal(permission, "view");
        return denied ? new Response(null, { status: 401 }) : { workspace: { id: "tenant-a" } };
      },
      isResponse: (value) => value instanceof Response,
    },
    "../../_lib/http": { clean: (value) => String(value ?? "").trim(), json: (data, status = 200) => Response.json(data, { status }) },
  });
  const DB = { prepare(sql) {
    const query = { sql, bindings: [], method: null };
    queries.push(query);
    return {
      bind(...bindings) { query.bindings = bindings; return this; },
      async all() { query.method = "all"; if (fail) throw new Error("private database detail"); return { results: rows }; },
      async first() { query.method = "first"; if (fail) throw new Error("private database detail"); return { total }; },
    };
  } };
  return {
    queries,
    get: (query = "") => module.onRequestGet({ request: new Request(`http://localhost/api/weights${query ? `?${query}` : ""}`), env: { DB } }),
  };
}

test("dog_id scopes rows and count to the authenticated workspace", async () => {
  const h = handlerHarness();
  const response = await h.get("dog_id=dog-a&limit=10&offset=20");
  assert.deepEqual(await response.json(), { data: [{ id: "weight-1", dog_id: "dog-a", weight: 32.5 }], total: 1 });
  assert.equal(h.queries.length, 2);
  for (const query of h.queries) {
    assert.match(query.sql, /w\.workspace_id = \?/);
    assert.match(query.sql, /w\.dog_id = \?/);
    assert.deepEqual(query.bindings.slice(0, 2), ["tenant-a", "dog-a"]);
  }
  assert.deepEqual(h.queries[0].bindings, ["tenant-a", "dog-a", 10, 20]);
  assert.deepEqual(h.queries[1].bindings, ["tenant-a", "dog-a"]);
});

test("search, pagination, order and legacy response stay intact without dog_id", async () => {
  const h = handlerHarness();
  const response = await h.get("search=K9&limit=5&offset=5");
  assert.deepEqual(await response.json(), { data: [{ id: "weight-1", dog_id: "dog-a", weight: 32.5 }], total: 1 });
  const rows = h.queries.find((query) => /ORDER BY/.test(query.sql));
  const count = h.queries.find((query) => !/ORDER BY/.test(query.sql));
  assert.ok(rows); assert.ok(count);
  assert.doesNotMatch(rows.sql, /w\.dog_id = \?/);
  assert.match(rows.sql, /ORDER BY w\.date DESC, w\.created_at DESC LIMIT \? OFFSET \?/);
  assert.deepEqual(rows.bindings, ["tenant-a", "%K9%", "%K9%", 5, 5]);
  assert.deepEqual(count.bindings, ["tenant-a", "%K9%", "%K9%"]);
});

test("empty dog_id preserves unfiltered legacy list behavior", async () => {
  const h = handlerHarness();
  await h.get("dog_id=%20&limit=10");
  assert.doesNotMatch(h.queries[0].sql, /w\.dog_id = \?/);
  assert.deepEqual(h.queries[0].bindings, ["tenant-a", 10, 0]);
});

test("authentication denial performs no database reads", async () => {
  const h = handlerHarness({ denied: true });
  assert.equal((await h.get("dog_id=dog-a")).status, 401);
  assert.equal(h.queries.length, 0);
});

test("database failures remain sanitized", async () => {
  const h = handlerHarness({ fail: true });
  const response = await h.get("dog_id=dog-a&limit=10");
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /private database detail/);
});

test("client listForK9 encodes the dog filter and returns the paginated shape", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return Response.json({ data: [{ id: "weight-1" }], total: 12 });
  };
  try {
    const module = loadModule("../src/lib/weightsApi.ts", {
      "./auth": { apiRequest: async (path) => {
        calls.push(path);
        const response = await globalThis.fetch(path);
        return response.json();
      } },
    });
    assert.deepEqual(await module.weightsApi.listForK9("dog id/a", 10, 20), { data: [{ id: "weight-1" }], total: 12 });
    const url = new URL(calls[0], "http://localhost");
    assert.equal(url.pathname, "/api/weights");
    assert.equal(url.searchParams.get("dog_id"), "dog id/a");
    assert.equal(url.searchParams.get("limit"), "10");
    assert.equal(url.searchParams.get("offset"), "20");
  } finally {
    globalThis.fetch = originalFetch;
  }
});