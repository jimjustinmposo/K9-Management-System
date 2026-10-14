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

test("revalidation drops cached values without affecting pending requests", async () => {
  let calls = 0;
  await cachedApiGet("/api/k9", async () => ++calls);
  revalidateApiCache();
  await cachedApiGet("/api/k9", async () => ++calls);
  assert.equal(calls, 2);
});