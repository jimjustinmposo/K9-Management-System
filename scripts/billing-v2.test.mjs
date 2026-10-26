import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import ts from "typescript";

function load(file, overrides = {}) {
  const exports = {};
  const source = readFileSync(new URL(`../functions/_lib/${file}.ts`, import.meta.url), "utf8");
  new Function("require", "exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(
    name => { if (!(name in overrides)) throw new Error(`Unexpected import ${name}`); return overrides[name]; }, exports);
  return exports;
}
const id = (prefix, char) => `${prefix}_${char.repeat(26)}`;
const sub = id("sub", "a"), customer = id("ctm", "b"), price = id("pri", "c"), transaction = id("txn", "d"), product = id("pro", "e");
function harness() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON; CREATE TABLE workspaces(id TEXT PRIMARY KEY,subscription_status TEXT,current_period_end TEXT); INSERT INTO workspaces VALUES('a','active','2099-01-01T00:00:00Z'),('b','incomplete',NULL);");
  sqlite.exec(readFileSync(new URL("../migrations/0030_billing_isolation.sql", import.meta.url), "utf8"));
  sqlite.prepare("INSERT INTO billing_checkout_attempts VALUES('attempt','sandbox','a',?,?,'ready','2026-01-01')").run(price,transaction);
  let failBatch = false, failApi = false;
  const DB = {
    prepare(sql) {
      return { sql, values: [], bind(...values) { return { ...this, values }; },
        async first() { return sqlite.prepare(this.sql).get(...this.values) ?? null; },
        async run() { const result = sqlite.prepare(this.sql).run(...this.values); return { success:true, meta:{changes:result.changes} }; } };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results=[];
        for (let i=0; i<statements.length; i++) {
          if (failBatch && i===1) throw new Error("Injected partial failure");
          results.push(await statements[i].run());
        }
        sqlite.exec("COMMIT"); return results;
      } catch(error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  // Serialize complete batches like D1, while permitting concurrent handler reads/API calls.
  const batch=DB.batch.bind(DB); let tail=Promise.resolve();
  DB.batch=statements => { const next=tail.then(()=>batch(statements)); tail=next.catch(()=>{}); return next; };
  const state={id:sub,customer_id:customer,status:"active",updated_at:"2026-10-26T01:00:00.123456Z",current_billing_period:{ends_at:"2099-01-01T00:00:00Z"},scheduled_change:null,items:[{quantity:1,price:{id:price,product_id:product}}]};
  let txCustomer=customer;
  const api={paddleRequest:async (_env,path) => {
    if(failApi) throw new Error("API unavailable");
    if(path.startsWith("/subscriptions/")) return structuredClone(state);
    if(path.startsWith("/prices/")) return {id:price,product_id:product,status:"active",billing_cycle:{interval:"month",frequency:1}};
    if(path.startsWith("/transactions/")) return {id:transaction,subscription_id:sub,customer_id:txCustomer};
    if(path==="/transactions") return {id:transaction};
    throw new Error("Unexpected API request");
  }};
  const helpers=load("billing-state",{"./paddle":api});
  const http={json:(body,status=200)=>Response.json(body,{status})};
  const webhook=load("billing-webhook",{"./billing-state":helpers,"./paddle":api,"./http":http});
  const checkout=load("billing-checkout",{"./billing-state":helpers,"./paddle":api,"./http":http});
  const env={DB,PADDLE_ENVIRONMENT:"sandbox",PADDLE_MONTHLY_PRICE_ID:price,PADDLE_YEARLY_PRICE_ID:id("pri","f"),PADDLE_MONTHLY_PRODUCT_ID:product,PADDLE_YEARLY_PRODUCT_ID:product};
  const event=(char="g",type="subscription.created")=>({event_id:id("evt",char),event_type:type,occurred_at:"2026-10-26T01:00:00Z",data:{id:sub,transaction_id:transaction,custom_data:{workspace_id:"b"}}});
  return {sqlite,DB,env,state,event,helpers,checkout,send:e=>webhook.processBillingEvent(env,e),failBatch:v=>{failBatch=v;},failApi:v=>{failApi=v;},wrongCustomer:()=>{txCustomer=id("ctm","z");}};
}
test("trusted transaction wins over forged workspace metadata; duplicate is durable",async()=>{
 const h=harness(); assert.equal((await h.send(h.event())).status,200);
 assert.equal(h.sqlite.prepare("SELECT workspace_id FROM billing_subscriptions").get().workspace_id,"a");
 assert.equal((await (await h.send(h.event())).json()).duplicate,true);
 assert.equal(h.sqlite.prepare("SELECT COUNT(*) n FROM billing_event_receipts").get().n,1);
});
test("concurrent duplicates commit one receipt and subscription",async()=>{
 const h=harness(); const responses=await Promise.all([h.send(h.event()),h.send(h.event())]);
 assert.deepEqual(responses.map(r=>r.status),[200,200]);
 assert.equal(h.sqlite.prepare("SELECT COUNT(*) n FROM billing_event_receipts").get().n,1);
});
test("failure after receipt insert rolls back everything and redelivery succeeds",async()=>{
 const h=harness(); h.failBatch(true); assert.equal((await h.send(h.event())).status,503);
 assert.equal(h.sqlite.prepare("SELECT COUNT(*) n FROM billing_event_receipts").get().n,0);
 assert.equal(h.sqlite.prepare("SELECT COUNT(*) n FROM billing_subscriptions").get().n,0);
 h.failBatch(false); assert.equal((await h.send(h.event())).status,200);
});
test("API failure is retryable without a completed receipt",async()=>{
 const h=harness(); h.failApi(true); assert.equal((await h.send(h.event())).status,503);
 h.failApi(false); assert.equal((await h.send(h.event())).status,200);
});
test("older canonical versions cannot undo newer cancellation; equal timestamps are no-ops",async()=>{
 const h=harness(); await h.send(h.event()); h.state.status="canceled"; h.state.updated_at="2026-10-26T01:00:00.123457Z";
 await h.send(h.event("h","subscription.canceled"));
 h.state.status="active"; h.state.updated_at="2026-10-26T01:00:00.123456Z";
 assert.equal((await h.send(h.event("i","subscription.updated"))).status,200);
 assert.equal(h.sqlite.prepare("SELECT status FROM billing_subscriptions").get().status,"canceled");
 h.state.updated_at="2026-10-26T01:00:00.123457Z";
 await h.send(h.event("j","subscription.updated"));
 assert.equal(h.sqlite.prepare("SELECT status FROM billing_subscriptions").get().status,"canceled");
});
test("unknown association, cross-customer, unknown price and cross-environment events fail",async()=>{
 for(const change of [h=>h.sqlite.exec("DELETE FROM billing_checkout_attempts"),h=>h.wrongCustomer(),h=>{h.state.items[0].price.id=id("pri","z");},h=>{h.env.PADDLE_ENVIRONMENT="production";}]) {
  const h=harness(); change(h); assert.equal((await h.send(h.event())).status,503);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) n FROM billing_subscriptions").get().n,0);
 }
});
test("out-of-order update retries until creation establishes trusted association",async()=>{
 const h=harness(); const update=h.event("h","subscription.updated");
 assert.equal((await h.send(update)).status,503); await h.send(h.event());
 assert.equal((await h.send(update)).status,200);
});
test("scheduled cancellation retains access; terminal cancellation removes it",async()=>{
 const h=harness(); h.state.scheduled_change={action:"cancel",effective_at:"2099-01-01T00:00:00Z"}; await h.send(h.event());
 assert.equal((await h.helpers.billingAccess(h.DB,"a","sandbox")).writable,true);
 h.state.status="canceled";h.state.current_billing_period=null;h.state.updated_at="2026-10-27T00:00:00Z";
 await h.send(h.event("h","subscription.canceled"));
 assert.equal((await h.helpers.billingAccess(h.DB,"a","sandbox")).writable,false);
});
test("payment-failure event reconciles subscription instead of inventing past_due",async()=>{
 const h=harness();await h.send(h.event());const e=h.event("h","transaction.payment_failed");e.data={subscription_id:sub};
 await h.send(e);assert.equal(h.sqlite.prepare("SELECT status FROM billing_subscriptions").get().status,"active");
});
test("legacy snapshot is fixed; sandbox renewals cannot extend live access",async()=>{
 const h=harness();const sql=readFileSync(new URL("./billing-cutover.sql",import.meta.url),"utf8");
 h.sqlite.exec(sql);h.sqlite.exec("UPDATE workspaces SET current_period_end='2199-01-01T00:00:00Z' WHERE id='a'");h.sqlite.exec(sql);
 assert.equal(h.sqlite.prepare("SELECT expires_at FROM billing_legacy_grants").get().expires_at,"2099-01-01T00:00:00Z");
 assert.equal((await h.helpers.billingAccess(h.DB,"a","production",Date.parse("2098-01-01"))).writable,true);
 assert.equal((await h.helpers.billingAccess(h.DB,"a","production",Date.parse("2099-01-01"))).writable,false);
 assert.equal((await h.helpers.billingAccess(h.DB,"a","sandbox")).writable,false);
});
test("invalid paid-through date blocks snapshot",()=>{
 const h=harness();h.sqlite.exec("UPDATE workspaces SET current_period_end=NULL WHERE id='a'");
 assert.throws(()=>h.sqlite.exec(readFileSync(new URL("./billing-cutover.sql",import.meta.url),"utf8")));
 assert.equal(h.sqlite.prepare("SELECT COUNT(*) n FROM billing_legacy_grants").get().n,0);
});
test("checkout reuses known transaction, and uncertain requests cannot be duplicated",async()=>{
 const h=harness(); assert.equal((await h.checkout.createBillingCheckout(h.env,"a","month")).status,200);
 h.sqlite.exec("UPDATE billing_checkout_attempts SET state='review'");
 assert.equal((await h.checkout.createBillingCheckout(h.env,"a","month")).status,409);
 assert.throws(()=>h.sqlite.prepare("INSERT INTO billing_checkout_attempts VALUES('second','sandbox','a',?,NULL,'creating','now')").run(price));
});
test("renewal extends verified access; pause and past_due remove paid access; resume restores it",async()=>{
 const h=harness();await h.send(h.event());
 for(const [index,status] of ["past_due","paused","active"].entries()) {
  h.state.status=status;h.state.updated_at=`2026-10-${27+index}T00:00:00Z`;
  h.state.current_billing_period={ends_at:"2100-01-01T00:00:00Z"};
  await h.send(h.event(["h","i","j"][index],"subscription.updated"));
  const access=await h.helpers.billingAccess(h.DB,"a","sandbox");
  assert.equal(access.writable,status==="active");
  assert.equal(access.periodEnd,"2100-01-01T00:00:00.000000Z");
 }
});