import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import test from "node:test";
import ts from "typescript";

function load(name) {
  const exports = {};
  const source = readFileSync(new URL(`../functions/_lib/${name}.ts`, import.meta.url), "utf8");
  new Function("exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports);
  return exports;
}
const { verifyPaddleSignature } = load("paddle-signature");
const { validatePaddleEnvironment, assertPaddleCheckoutEnabled, paddleRequest } = load("paddle");
const secret = "local-fixture-secret-not-a-provider-credential";
const timestamp = 1800000000;
const body = '{ "event_id": "fixture", "name": "犬" }';
const sign = (value = body) => createHmac("sha256", secret).update(`${timestamp}:${value}`).digest("hex");
const header = `ts=${timestamp};h1=${sign()}`;
const env = {
  PADDLE_ENVIRONMENT: "sandbox", PADDLE_API_KEY: "pdl_sdbx_apikey_fixture",
  PADDLE_CLIENT_TOKEN: "test_fixture", PADDLE_MONTHLY_PRICE_ID: `pri_${"a".repeat(26)}`,
  PADDLE_YEARLY_PRICE_ID: `pri_${"b".repeat(26)}`,
};
test("original Unicode body verifies; parsed/reserialized and tampered bodies fail", async () => {
  assert.equal(await verifyPaddleSignature(body, header, secret, timestamp * 1000), true);
  for (const altered of [JSON.stringify(JSON.parse(body)), body + " "])
    assert.equal(await verifyPaddleSignature(altered, header, secret, timestamp * 1000), false);
});
test("wrong or missing secrets and malformed headers fail", async () => {
  for (const key of ["wrong", ""])
    assert.equal(await verifyPaddleSignature(body, header, key, timestamp * 1000), false);
  for (const h of ["", `ts=${timestamp}`, `ts=${timestamp};h1=garbage`, `${header};ts=${timestamp}`, "ts=NaN;h1=00"])
    assert.equal(await verifyPaddleSignature(body, h, secret, timestamp * 1000), false);
});
test("expired and future signatures fail; five-second boundary is accepted", async () => {
  for (const offset of [-6000, 6000])
    assert.equal(await verifyPaddleSignature(body, header, secret, timestamp * 1000 + offset), false);
  assert.equal(await verifyPaddleSignature(body, header, secret, timestamp * 1000 + 5000), true);
});
test("multiple h1 rotation signatures supported in either order", async () => {
  for (const h of [`${header};h1=${"0".repeat(64)}`, `ts=${timestamp};h1=${"0".repeat(64)};h1=${sign()}`])
    assert.equal(await verifyPaddleSignature(body, h, secret, timestamp * 1000), true);
});
test("sandbox configuration accepts existing shape; mixed and incomplete config fails", () => {
  assert.doesNotThrow(() => validatePaddleEnvironment(env));
  for (const delta of [
    { PADDLE_ENVIRONMENT: undefined }, { PADDLE_API_KEY: "pdl_live_apikey_fixture" },
    { PADDLE_CLIENT_TOKEN: "live_fixture" }, { PADDLE_MONTHLY_PRICE_ID: "pri_replace_me" },
    { PADDLE_YEARLY_PRICE_ID: env.PADDLE_MONTHLY_PRICE_ID },
  ]) assert.throws(() => validatePaddleEnvironment({ ...env, ...delta }));
});
test("checkout pause and live readiness gates fail closed", () => {
  assert.doesNotThrow(() => assertPaddleCheckoutEnabled(env));
  for (const value of ["false", "typo"])
    assert.throws(() => assertPaddleCheckoutEnabled({ ...env, PADDLE_CHECKOUT_ENABLED: value }));
  const live = { ...env, PADDLE_ENVIRONMENT: "production", PADDLE_API_KEY: "pdl_live_apikey_fixture", PADDLE_CLIENT_TOKEN: "live_fixture" };
  assert.throws(() => assertPaddleCheckoutEnabled(live), /migration readiness/);
  assert.throws(() => validatePaddleEnvironment({ ...live, LOCAL_DEV_FULL_ACCESS: "true" }));
});
test("API wrapper pins host, authorization, version and rejects redirects", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return Response.json({ data: { id: "fixture" } });
  };
  try {
    await paddleRequest(env, "/transactions", { method: "GET", headers: { Authorization: "override" } });
    assert.equal(calls[0].url, "https://sandbox-api.paddle.com/transactions");
    assert.equal(calls[0].init.headers.get("Authorization"), `Bearer ${env.PADDLE_API_KEY}`);
    assert.equal(calls[0].init.headers.get("Paddle-Version"), "1");
    assert.equal(calls[0].init.redirect, "manual");
    globalThis.fetch = async () => new Response(null, { status: 302, headers: { Location: "https://untrusted.example" } });
    await assert.rejects(paddleRequest(env, "/transactions", { method: "GET" }), /redirected/);
    await assert.rejects(paddleRequest(env, "//untrusted.example", {}));
    assert.equal(calls.length, 1);
  } finally { globalThis.fetch = original; }
});