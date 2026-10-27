import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function load(path, dependencies = {}, fetcher = fetch) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function("require", "exports", "fetch", code)((name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`);
    return dependencies[name];
  }, exports, fetcher);
  return exports;
}
const request = (ip) => new Request("https://example.test/webhook", { headers: ip ? { "CF-Connecting-IP": ip } : {} });

test("live IP check uses dynamic /32 list, caches it, and rejects unknown/missing sources", async () => {
  let calls = 0;
  const api = load("functions/_lib/paddleIps.ts", {}, async (url) => {
    calls++;
    assert.equal(url, "https://api.paddle.com/ips");
    return Response.json({ data: { ipv4_cidrs: ["192.0.2.1/32"] } });
  });
  assert.equal(await api.isPaddleLiveIp(request()), false);
  assert.equal(await api.isPaddleLiveIp(request("192.0.2.1")), true);
  assert.equal(await api.isPaddleLiveIp(request("192.0.2.2")), false);
  assert.equal(calls, 1);
});

test("IP lookup rejects unavailable, empty, malformed, and unexpected network ranges", async () => {
  for (const payload of [null, [], ["192.0.2.0/24"], ["999.0.0.1/32"]]) {
    const api = load("functions/_lib/paddleIps.ts", {}, async () => Response.json({ data: { ipv4_cidrs: payload } }));
    await assert.rejects(api.isPaddleLiveIp(request("192.0.2.1")));
  }
  const api = load("functions/_lib/paddleIps.ts", {}, async () => new Response(null, { status: 503 }));
  await assert.rejects(api.isPaddleLiveIp(request("192.0.2.1")));
});

test("billing config reads only the authenticated workspace customer and exposes no secret", async () => {
  const api = load("functions/api/billing/config.ts", {
    "../../_lib/auth": { requireSession: async () => ({ workspace: { id: "workspace-a" } }), isResponse: (value) => value instanceof Response },
    "../../_lib/http": { json: (body, status = 200) => Response.json(body, { status }) },
  });
  const response = await api.onRequestGet({ env: {
    PADDLE_CLIENT_TOKEN: "live_public", PADDLE_ENVIRONMENT: "production", PADDLE_API_KEY: "private",
    DB: { prepare(sql) {
      assert.equal(sql, "SELECT paddle_customer_id FROM workspaces WHERE id=?");
      return { bind(id) { assert.equal(id, "workspace-a"); return { first: async () => ({ paddle_customer_id: "ctm_customer" }) }; } };
    } },
  } });
  assert.deepEqual(await response.json(), { data: { clientToken: "live_public", environment: "production", customerId: "ctm_customer" } });
});

test("live webhook rejects denied IPs and fails closed on lookup outage before DB access", async () => {
  for (const [lookup, status] of [[async () => false, 403], [async () => { throw new Error("offline"); }, 503]]) {
    const api = load("functions/api/billing/webhook.ts", {
      "../../_lib/http": { json: (body, status = 200) => Response.json(body, { status }) },
      "../../_lib/paddleIps": { isPaddleLiveIp: lookup },
    });
    const response = await api.onRequestPost({ request: request("192.0.2.2"), env: { PADDLE_ENVIRONMENT: "production", PADDLE_WEBHOOK_SECRET: "secret" } });
    assert.equal(response.status, status);
  }
});

test("sandbox keeps signature verification without enforcing live IPs", async () => {
  const api = load("functions/api/billing/webhook.ts", {
    "../../_lib/http": { json: (body, status = 200) => Response.json(body, { status }) },
    "../../_lib/paddleIps": { isPaddleLiveIp: () => { assert.fail("Sandbox must not use live IPs"); } },
  });
  const response = await api.onRequestPost({ request: request(), env: { PADDLE_ENVIRONMENT: "sandbox", PADDLE_WEBHOOK_SECRET: "secret" } });
  assert.equal(response.status, 401);
});