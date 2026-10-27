import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/components/ui/auth-switch.tsx", import.meta.url), "utf8");
const handler = source.slice(source.indexOf("  const submitSignIn ="), source.indexOf("  const submitSignUp ="));
assert.ok(handler.includes("const submitSignIn ="));
const compiled = ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function harness(failure) {
  const events = [];
  const submit = new Function("apiRequest", "refresh", "navigate", "setSaving", "setError", "FormData", `${compiled}; return submitSignIn;`)(
    async (path, options) => {
      events.push(["login", path, JSON.parse(options.body)]);
      if (failure === "login") throw new Error("Invalid credentials");
    },
    async () => { events.push(["refresh"]); if (failure === "refresh") throw new Error("Session unavailable"); },
    (path, options) => events.push(["navigate", path, options]),
    value => events.push(["saving", value]),
    value => events.push(["error", value]),
    class { get(key) { return key === "email" ? "test@example.test" : "fixture-password"; } },
  );
  return { events, submit: () => submit({ preventDefault() {}, currentTarget: {} }) };
}

test("successful sign-in refreshes session before replacing history with dashboard", async () => {
  const h = harness();
  await h.submit();
  assert.deepEqual(h.events.filter(([name]) => ["login", "refresh", "navigate"].includes(name)), [
    ["login", "/api/auth/login", { email: "test@example.test", password: "fixture-password" }],
    ["refresh"], ["navigate", "/dashboard", { replace: true }],
  ]);
  assert.deepEqual(h.events.at(-1), ["saving", false]);
});

for (const failure of ["login", "refresh"]) {
  test(`${failure} failure stays on sign-in and clears pending state`, async () => {
    const h = harness(failure);
    await h.submit();
    assert.ok(!h.events.some(([name]) => name === "navigate"));
    assert.ok(h.events.some(([name, value]) => name === "error" && value));
    assert.deepEqual(h.events.at(-1), ["saving", false]);
  });
}