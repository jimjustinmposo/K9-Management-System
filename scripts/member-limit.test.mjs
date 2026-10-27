import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function harness(active, pending = 0, archived = true, denied = false) {
  const writes = [];
  const queries = [];
  const db = { prepare(sql) {
    let bindings;
    return {
      bind(...args) { bindings = args; return this; },
      async first() {
        queries.push({ sql, bindings });
        if (sql.includes("COUNT(*)")) return { count: sql.includes("memberships") ? active : pending };
        if (sql.includes("SELECT user_id,archived_at")) return { user_id: "member", archived_at: archived ? "2026-01-01" : null };
        return null;
      },
      async all() { return { results: [] }; },
      async run() { writes.push(sql); return { success: true }; },
    };
  } };
  function load(path) {
    const exports = {};
    const code = ts.transpileModule(readFileSync(new URL(`../functions/${path}.ts`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function("require", "exports", code)((name) => {
      if (name.endsWith("/auth")) return {
        requireSession: async () => denied ? new Response(null, { status: 403 }) : { workspace: { id: "workspace", name: "Test" }, user: { name: "Owner" } },
        isResponse: value => value instanceof Response,
        hashPassword: async () => ({ hash: "fixture", salt: "fixture" }),
        hashToken: async () => "fixture", randomToken: () => "fixture",
      };
      if (name.endsWith("/email")) return { sendEmail: async () => {} };
      if (name.endsWith("/http")) return {
        json: (data, status = 200) => Response.json(data, { status }),
        clean: value => typeof value === "string" ? value.trim() : "", id: () => "fixture", appUrl: () => "https://example.test",
      };
      if (name.endsWith("/member-seats")) return load("_lib/member-seats");
      throw new Error(`Unexpected import ${name}`);
    }, exports);
    return exports;
  }
  async function request(path, method, body) {
    return load(path)[`onRequest${method[0]}${method.slice(1).toLowerCase()}`]({
      request: new Request("https://example.test/api/members", { method, ...(body ? { body: JSON.stringify(body) } : {}) }),
      env: { DB: db }, params: { id: "member" },
    });
  }
  return { request, writes, queries };
}
const member = { name: "Test", email: "test@example.test", password: "fixture-password", confirmPassword: "fixture-password" };
for (const [path, body] of [["api/members/create", member], ["api/members/index", { email: member.email }]]) {
  test(`${path}: fifth seat allowed; sixth blocked; pending invitations reserve capacity`, async () => {
    assert.equal((await harness(4).request(path, "POST", body)).status, 201);
    for (const [active, pending] of [[5, 0], [4, 1], [3, 2]]) {
      const h = harness(active, pending);
      const result = await h.request(path, "POST", body);
      assert.equal(result.status, 409);
      assert.match((await result.json()).error, /5 member accounts/);
      assert.ok(!h.writes.some(sql => sql.startsWith("INSERT")));
      for (const query of h.queries.filter(query => query.sql.includes("COUNT(*)"))) {
        assert.equal(query.bindings[0], "workspace");
        assert.match(query.sql, query.sql.includes("memberships") ? /role='member' AND archived_at IS NULL/ : /status='pending' AND expires_at>\?/);
      }
    }
    assert.equal((await harness(0, 0, true, true).request(path, "POST", body)).status, 403);
  });
}
test("member listing reports five included seats", async () => {
  const response = await harness(3, 1).request("api/members/index", "GET");
  assert.deepEqual((await response.json()).data.seats, { included: 5, used: 4, extra: 0 });
});
test("restoring reserves capacity but archiving and active no-op are allowed at limit", async () => {
  assert.equal((await harness(4).request("api/members/[id]", "PUT", { archived: false })).status, 200);
  const full = harness(5);
  assert.equal((await full.request("api/members/[id]", "PUT", { archived: false })).status, 409);
  assert.equal(full.writes.length, 0);
  assert.equal((await harness(5).request("api/members/[id]", "PUT", { archived: true })).status, 200);
  assert.equal((await harness(5, 0, false).request("api/members/[id]", "PUT", { archived: false })).status, 200);
});