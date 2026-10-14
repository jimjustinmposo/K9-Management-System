import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/sessionController.ts", import.meta.url), "utf8");
const exports = {};
new Function("exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness() {
  const reads = [], writes = [], sessions = [];
  let ready = 0;
  const controller = exports.createSessionController(
    () => { const d = deferred(); reads.push(d); return d.promise; },
    () => { const d = deferred(); writes.push(d); return d.promise; },
    (session) => sessions.push(session),
    () => ready++,
  );
  return { controller, reads, writes, sessions, get ready() { return ready; } };
}

test("poll/focus/visibility share one pending session read, but not a cached result", async () => {
  const h = harness();
  const first = h.controller.start();
  assert.equal(h.controller.refresh(false), first);
  assert.equal(h.controller.refresh(false), first);
  await Promise.resolve();
  assert.equal(h.reads.length, 1);
  h.reads[0].resolve("owner"); await first;
  assert.deepEqual(h.sessions, ["owner"]);
  const next = h.controller.refresh(false); await Promise.resolve();
  assert.equal(h.reads.length, 2);
  h.reads[1].resolve("member"); await next;
  assert.equal(h.ready, 2);
});

for (const staleFails of [false, true]) {
  test(`explicit login/checkout refresh supersedes stale background ${staleFails ? "failure" : "success"}`, async () => {
    const h = harness();
    const old = h.controller.start(); await Promise.resolve();
    const fresh = h.controller.refresh(); await Promise.resolve();
    assert.equal(h.reads.length, 2);
    h.reads[1].resolve("new-session"); await fresh;
    staleFails ? h.reads[0].reject(new Error("offline")) : h.reads[0].resolve("old-session");
    await old;
    assert.deepEqual(h.sessions, ["new-session"]);
    assert.equal(h.ready, 1);
  });
}

test("logout suppresses background reads and stale session resurrection", async () => {
  const h = harness();
  const old = h.controller.start(); await Promise.resolve();
  const logout = h.controller.logout(); await Promise.resolve();
  assert.equal(h.controller.logout(), logout);
  const background = h.controller.refresh(false);
  h.reads[0].resolve("old-session"); await old;
  assert.deepEqual(h.sessions, []);
  h.writes[0].resolve(); await logout; await background;
  assert.deepEqual(h.sessions, [null]);
  assert.equal(h.reads.length, 1);
  const next = h.controller.refresh(); await Promise.resolve();
  h.reads[1].resolve("new-login"); await next;
  assert.deepEqual(h.sessions, [null, "new-login"]);
});

test("logout network failure still rejects and allows subsequent refresh", async () => {
  const h = harness();
  const logout = h.controller.logout(); await Promise.resolve();
  const background = h.controller.refresh(false);
  h.writes[0].reject(new Error("offline"));
  await assert.rejects(logout, /offline/);
  await background;
  assert.deepEqual(h.sessions, []);
  const next = h.controller.refresh(false); await Promise.resolve();
  h.reads[0].resolve("session"); await next;
  assert.deepEqual(h.sessions, ["session"]);
});

test("unmount ignores results; effect restart accepts only the new request", async () => {
  const h = harness();
  const old = h.controller.start(); await Promise.resolve();
  h.controller.stop();
  await h.controller.refresh(false);
  assert.equal(h.reads.length, 1);
  const next = h.controller.start(); await Promise.resolve();
  h.reads[0].resolve("stale"); await old;
  assert.deepEqual(h.sessions, []);
  h.reads[1].resolve("current"); await next;
  assert.deepEqual(h.sessions, ["current"]);
});

test("current read failure clears session and releases loading", async () => {
  const h = harness();
  const request = h.controller.start(); await Promise.resolve();
  h.reads[0].reject(new Error("offline")); await request;
  assert.deepEqual(h.sessions, [null]);
  assert.equal(h.ready, 1);
});