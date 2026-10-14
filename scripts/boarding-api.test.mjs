import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Execute the actual client module with isolated fetch/storage/K9 dependencies.
// No network requests, browser storage, database writes, or new dependencies.
const source = readFileSync(new URL("../src/lib/boardingApi.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const values = { k9Id: "dog-1", ownerName: " Owner ", ownerPhone: " 123 ", checkInDate: "2026-01-01", checkOutDate: "2026-01-03", currency: "USD", pricePerDay: 12.5, status: "Checked Out", notes: " Note " };
const dog = { id: "dog-1", dogName: "Roster dog", nickName: "Roster nickname", breed: "Roster breed", profilePhoto: "roster-photo" };
const row = { id: "stay-1", k9_id: "dog-1", owner_name: "Owner", owner_phone: "123", check_in_date: "2026-01-01", check_out_date: "2026-01-03", currency: "USD", price_per_day: "12.5", total_amount: "37.5", status: "Checked Out", notes: "Note", created_at: "created", updated_at: "updated", dog_name: "Joined dog", nick_name: "", breed: "Joined breed", profile_photo: "" };
const expected = { id: "stay-1", k9Id: "dog-1", ownerName: "Owner", ownerPhone: "123", checkInDate: "2026-01-01", checkOutDate: "2026-01-03", currency: "USD", pricePerDay: 12.5, totalAmount: 37.5, status: "Checked Out", notes: "Note", createdAt: "created", updatedAt: "updated", k9: { id: "dog-1", dogName: "Joined dog", nickName: "", breed: "Joined breed", profilePhoto: "" } };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

function harness(response, roster = [dog]) {
  const calls = [];
  const storage = new Map();
  const exports = {};
  const require = (name) => {
    if (name === "./k9Api") return { k9Api: { list: async () => { calls.push({ path: "/api/k9" }); return roster; } } };
    if (name === "./apiCache") return { cachedApiFetch: (_path, load) => load(), invalidateApiCache: () => {} };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  const fetch = async (path, init) => {
    calls.push({ path, init });
    if (response instanceof Error) throw response;
    return response.clone();
  };
  const localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  new Function("require", "exports", "fetch", "localStorage", compiled)(require, exports, fetch, localStorage);
  return { api: exports.boardingApi, calls, storage };
}

const baseline = process.argv.includes("--baseline");
for (const method of ["list", "get", "create", "update"]) {
  test(`${method}: complete joined response preserves mapping and request count`, async () => {
    const h = harness(json({ data: method === "list" ? [row] : row }));
    const result = method === "list" ? await h.api.list() : method === "get" ? await h.api.get("stay-1") : method === "create" ? await h.api.create(values) : await h.api.update("stay-1", values);
    assert.deepEqual(method === "list" ? result[0] : result, expected);
    assert.equal(h.calls.length, baseline ? 2 : 1);
    if (method === "create" || method === "update") {
      assert.deepEqual(JSON.parse(h.calls[0].init.body), { k9_id: "dog-1", owner_name: "Owner", owner_phone: "123", check_in_date: "2026-01-01", check_out_date: "2026-01-03", currency: "USD", price_per_day: 12.5, status: "Checked Out", notes: "Note" });
    }
  });
}

test("partial joined rows retain roster enrichment once per list", async () => {
  const h = harness(json({ data: [{ ...row, dog_name: null }, { ...row, id: "stay-2", breed: null }] }));
  const result = await h.api.list();
  assert.equal(h.calls.length, 2);
  assert.equal(result[0].k9.dogName, dog.dogName);
  assert.equal(result[1].k9.breed, dog.breed);
  assert.equal(result[0].k9.nickName, "");
});

test("get: missing record remains null without fetching roster", async () => {
  const h = harness(json({ error: "not found" }, 404));
  assert.equal(await h.api.get("missing"), null);
  assert.equal(h.calls.length, 1);
});

test("JSON authorization/server errors never silently fall back", async () => {
  for (const status of [401, 403, 500]) {
    for (const method of ["list", "get", "create", "update", "remove"]) {
      const h = harness(json({ error: "Denied" }, status));
      await assert.rejects(() => method === "create" ? h.api.create(values) : method === "update" ? h.api.update("stay-1", values) : h.api[method]("stay-1"), /Denied/);
      assert.equal(h.calls.length, 1);
      assert.equal(h.storage.size, 0);
    }
  }
});

for (const mode of ["network failure", "Vite HTML response"]) {
  test(`${mode}: local CRUD, pricing and paging preserved`, async () => {
    const h = harness(mode === "network failure" ? new Error("offline") : new Response("<html></html>", { headers: { "Content-Type": "text/html" } }));
    const saved = await h.api.create(values);
    assert.equal(saved.totalAmount, 37.5);
    assert.deepEqual(saved.k9, { ...dog });
    assert.equal((await h.api.get(saved.id)).id, saved.id);
    assert.equal((await h.api.list()).length, 1);
    const page = await h.api.listForK9("dog-1", 1, 0);
    assert.equal(page.total, 1);
    assert.equal(page.data[0].id, saved.id);
    assert.equal((await h.api.listForK9("other-dog", 1, 0)).total, 0);
    const updated = await h.api.update(saved.id, { ...values, checkOutDate: "2026-01-04" });
    assert.equal(updated.totalAmount, 50);
    await h.api.remove(saved.id);
    assert.deepEqual(await h.api.list(), []);
  });
}

test("local create still validates registered dog", async () => {
  const h = harness(new Error("offline"), []);
  await assert.rejects(() => h.api.create(values), /Register this dog/);
  assert.equal(h.storage.size, 0);
});