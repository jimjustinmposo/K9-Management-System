import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const exports = {};
new Function("exports", ts.transpileModule(readFileSync(new URL("../src/lib/latestLoad.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports);
function harness() {
  const loader = exports.createLatestLoad(), requests = [], events = [];
  function configure(label) {
    loader.configure(() => new Promise((resolve, reject) => requests.push({ resolve, reject, label })),
      () => events.push("start"), value => events.push(value), error => events.push(error.message), () => events.push("finish"));
  }
  return { loader, requests, events, configure };
}
for (const fails of [false, true]) {
  test(`older ${fails ? "error" : "success"} cannot replace latest rows or loading state`, async () => {
    const h = harness(); h.configure("search");
    const old = h.loader.run(), next = h.loader.run();
    fails ? h.requests[0].reject(new Error("stale")) : h.requests[0].resolve("stale");
    await old;
    assert.deepEqual(h.events, ["start", "start"]);
    h.requests[1].resolve("latest"); await next;
    assert.deepEqual(h.events, ["start", "start", "latest", "finish"]);
  });
}
test("query changes invalidate old reads before the next fetch starts", async () => {
  const h = harness(); h.configure("old"); const old = h.loader.run();
  h.configure("new"); h.requests[0].resolve("stale"); await old;
  assert.deepEqual(h.events, ["start"]);
  const next = h.loader.run(); h.requests[1].resolve("new"); await next;
  assert.equal(h.requests[1].label, "new");
});
test("captured mutation reload uses current query; unmount makes reload a no-op", async () => {
  const h = harness(); h.configure("old"); const reload = h.loader.run;
  h.configure("current"); const next = reload();
  assert.equal(h.requests[0].label, "current");
  h.loader.stop(); h.requests[0].resolve("ignored"); await next; await reload();
  assert.deepEqual(h.events, ["start"]);
  assert.equal(h.requests.length, 1);
});
test("current error is displayed and ends loading; restarting remains usable", async () => {
  const h = harness(); h.configure("first"); const first = h.loader.run();
  h.requests[0].reject(new Error("failed")); await first;
  assert.deepEqual(h.events, ["start", "failed", "finish"]);
  h.loader.stop(); h.configure("restart"); const next = h.loader.run();
  h.requests[1].resolve("ok"); await next;
  assert.deepEqual(h.events.slice(-3), ["start", "ok", "finish"]);
});

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
test("rapid search changes schedule only the final read", async () => {
  const h = harness(); let starts = 0;
  h.configure("a"); h.loader.schedule(20, () => starts++);
  h.loader.stop(); h.configure("ab"); h.loader.schedule(20, () => starts++);
  h.loader.stop(); h.configure("abc"); h.loader.schedule(20, () => starts++);
  assert.equal(h.requests.length, 0);
  await wait(40);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].label, "abc");
  assert.equal(starts, 1);
  h.requests[0].resolve("result");
});
test("unmount cancels a scheduled search", async () => {
  const h = harness(); h.configure("a");
  h.loader.schedule(20, () => assert.fail("canceled timer fired"));
  h.loader.stop(); await wait(40);
  assert.equal(h.requests.length, 0);
});
test("manual reload flushes a pending search without a second timer request", async () => {
  const h = harness(); h.configure("current");
  h.loader.schedule(20, () => assert.fail("flushed timer fired"));
  const request = h.loader.run();
  assert.equal(h.requests.length, 1);
  h.requests[0].resolve("saved"); await request; await wait(40);
  assert.equal(h.requests.length, 1);
});
test("initial and pagination reads can start immediately", async () => {
  const h = harness(); h.configure("page"); let starts = 0;
  h.loader.schedule(0, () => starts++);
  assert.equal(starts, 1);
  assert.equal(h.requests.length, 1);
  h.requests[0].resolve("page-result");
});