import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const exports = {};
new Function("exports", ts.transpileModule(readFileSync(new URL("../src/lib/apiCache.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports);
const { cachedApiGet, clearApiCache, invalidateApiCache, revalidateApiCache, setApiCacheScope } = exports;

test.beforeEach(() => { clearApiCache(); setApiCacheScope("workspace-a"); });

test("returns fresh cached GET values without another load", async () => {
  let calls = 0;
  assert.equal(await cachedApiGet("/api/k9?search=a", async () => ++calls), 1);
  assert.equal(await cachedApiGet("/api/k9?search=a", async () => ++calls), 1);
  assert.equal(calls, 1);
});

test("deduplicates concurrent identical GETs", async () => {
  let finish;
  let calls = 0;
  const load = () => { calls++; return new Promise((resolve) => { finish = resolve; }); };
  const a = cachedApiGet("/api/handlers", load);
  const b = cachedApiGet("/api/handlers", load);
  assert.equal(calls, 1);
  finish(["handler"]);
  assert.deepEqual(await Promise.all([a, b]), [["handler"], ["handler"]]);
});

test("expires entries and skips auth and billing requests", async () => {
  let calls = 0;
  await cachedApiGet("/api/k9", async () => ++calls, 0);
  await cachedApiGet("/api/k9", async () => ++calls, 0);
  await cachedApiGet("/api/auth/session", async () => ++calls);
  await cachedApiGet("/api/auth/session", async () => ++calls);
  assert.equal(calls, 4);
});

test("invalidates matching resource and preserves unrelated queries", async () => {
  let calls = 0;
  const load = async () => ++calls;
  await cachedApiGet("/api/training/obedience?limit=10", load);
  await cachedApiGet("/api/handlers?limit=10", load);
  invalidateApiCache("/api/training/obedience/record-id");
  await cachedApiGet("/api/training/obedience?limit=10", load);
  await cachedApiGet("/api/handlers?limit=10", load);
  assert.equal(calls, 3);
});

test("workspace changes isolate cache entries and clear old scope", async () => {
  let calls = 0;
  await cachedApiGet("/api/k9", async () => ++calls);
  setApiCacheScope("workspace-b");
  await cachedApiGet("/api/k9", async () => ++calls);
  assert.equal(calls, 2);
});

test("logout/account change clear sensitive values and prevent stale in-flight repopulation", async () => {
  let resolveOld;
  const old = cachedApiGet("/api/k9", () => new Promise((resolve) => { resolveOld = resolve; }));
  setApiCacheScope("workspace-b");
  await cachedApiGet("/api/k9", async () => "new-workspace");
  resolveOld("old-workspace");
  assert.equal(await old, "old-workspace");
  assert.equal(await cachedApiGet("/api/k9", async () => "unexpected"), "new-workspace");
  setApiCacheScope(null);
  assert.equal(await cachedApiGet("/api/k9", async () => "anonymous"), "anonymous");
});

test("explicit revalidation drops cached values", async () => {
  let calls = 0;
  await cachedApiGet("/api/k9", async () => ++calls);
  revalidateApiCache();
  await cachedApiGet("/api/k9", async () => ++calls);
  assert.equal(calls, 2);
});

test("mutation prevents a pending old read from repopulating the cache", async () => {
  let finish;
  const old = cachedApiGet("/api/k9", () => new Promise(resolve => { finish = resolve; }));
  invalidateApiCache("/api/k9/dog");
  assert.equal(await cachedApiGet("/api/k9", async () => "new"), "new");
  finish("old");
  await old;
  assert.equal(exports.peekApiCache("/api/k9"), "new");
});

test("feeding and shopping invalidate inventory and dashboard but preserve handlers", async () => {
  for (const resource of ["feeding", "shopping"]) {
    for (const path of ["/api/food-inventory", "/api/dashboard/view", "/api/handlers"]) await cachedApiGet(path, async () => "cached");
    invalidateApiCache(`/api/${resource}/record`);
    assert.equal(exports.peekApiCache("/api/food-inventory"), undefined);
    assert.equal(exports.peekApiCache("/api/dashboard/view"), undefined);
    assert.equal(exports.peekApiCache("/api/handlers"), "cached");
  }
});

test("failed responses are not retained and concurrent consumers have independent bodies", async () => {
  let calls = 0;
  const load = async () => { calls++; return Response.json({ error: "Denied" }, { status: 403 }); };
  const responses = await Promise.all([exports.cachedApiFetch("/api/k9", load), exports.cachedApiFetch("/api/k9", load)]);
  assert.equal(calls, 1);
  assert.deepEqual(await Promise.all(responses.map(response => response.json())), [{ error: "Denied" }, { error: "Denied" }]);
  await exports.cachedApiFetch("/api/k9", load);
  assert.equal(calls, 2);
});

test("fetch honors explicit TTL and synchronous snapshots expire", async () => {
  let calls = 0;
  const load = async () => Response.json({ count: ++calls });
  await exports.cachedApiFetch("/api/k9", load, 0);
  await exports.cachedApiFetch("/api/k9", load, 0);
  assert.equal(calls, 2);
  assert.equal(exports.peekApiCache("/api/k9"), undefined);
});

test("repeat-navigation simulation retains records after 30 seconds, expires after five minutes", async () => {
  const originalNow = Date.now;
  let time = 0;
  Date.now = () => time;
  try {
    let calls = 0;
    await cachedApiGet("/api/k9", async () => ++calls);
    time = 60_000;
    assert.equal(exports.peekApiCache("/api/k9"), 1);
    await cachedApiGet("/api/k9", async () => ++calls);
    assert.equal(calls, 1);
    time = 300_001;
    await cachedApiGet("/api/k9", async () => ++calls);
    assert.equal(calls, 2);
  } finally { Date.now = originalNow; }
});

test("member administration and billing bypass cache", async () => {
  let calls = 0;
  for (const path of ["/api/members", "/api/billing/config"]) {
    await cachedApiGet(path, async () => ++calls);
    await cachedApiGet(path, async () => ++calls);
  }
  assert.equal(calls, 4);
});

test("manual dashboard refresh invalidates its underlying sources", async () => {
  await cachedApiGet("/api/k9", async () => 1);
  invalidateApiCache("/api/dashboard/view");
  assert.equal(exports.peekApiCache("/api/k9"), undefined);
});