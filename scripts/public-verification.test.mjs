import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ts from "typescript";

const require = createRequire(import.meta.url);
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage renders without authentication and exposes policy/contact navigation", () => {
  const exports = {};
  const compiled = ts.transpileModule(read("src/pages/HomePage.tsx"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function("require", "exports", compiled)(require, exports);
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(exports.default)));
  for (const path of ["/terms", "/privacy", "/refund", "/contact-support", "/login"])
    assert.ok(html.includes(`href="${path}"`), path);
  assert.ok(html.includes('id="pricing"'));
  assert.ok(html.includes("$41"));
  assert.ok(html.includes("$443"));
});

test("legacy display matches current amounts without stale AED equivalents", () => {
  const legacy = read("src/pages/SubscribePage.tsx");
  const current = read("src/pages/SubscriptionPage.tsx");
  for (const amount of ["$41", "$443"]) {
    assert.ok(legacy.includes(amount));
    assert.ok(current.includes(amount));
  }
  assert.ok(!legacy.includes("AED"));
});

test("static headers reach build output without restricting checkout resource loading", () => {
  const headers = read("public/_headers");
  assert.equal(read("dist/_headers"), headers);
  assert.ok(headers.includes("X-Content-Type-Options: nosniff"));
  assert.ok(headers.includes("Referrer-Policy: strict-origin-when-cross-origin"));
  assert.ok(headers.includes("base-uri 'self'; object-src 'none'"));
  assert.doesNotMatch(headers, /default-src|script-src|connect-src|frame-src|X-Frame-Options/);
});

test("confirmed business copy avoids unsupported service promises", () => {
  for (const path of ["src/pages/HomePage.tsx", "src/pages/SubscriptionPage.tsx", "src/pages/SubscribePage.tsx"]) {
    const source = read(path);
    assert.ok(source.includes("All prices are in USD"), path);
    assert.ok(source.includes("Taxes are calculated at checkout"), path);
    assert.doesNotMatch(source, /Scheduled database backups|monitoring|Routine database optimization|Individual Access Plan|solo operators/);
  }
  const legal = read("src/pages/LegalPage.tsx");
  for (const value of ["Jim Justin M. Poso", "United Arab Emirates", "jimjustinmposo@gmail.com"])
    assert.ok(legal.includes(value));
  assert.ok(read("index.html").includes("$41 USD per month. Yearly: $443 USD per year"));
});