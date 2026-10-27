# Paddle Rejection — Exact Diagnosis

**Diagnosed:** 2026-10-27  
**Evidence:** Live HTTP probes against https://www.caninelogy.online at 07:19 UTC

---

## Root causes (in priority order)

### 1. SPA shell — Paddle's crawler sees no policy content (PRIMARY)

Every URL on caninelogy.online — including `/privacy-policy`, `/refund-policy`, `/terms`, `/privacy`, `/refund` — returns **exactly the same HTML shell**:

```html
<div id="root"></div>
<noscript>…</noscript>
<script type="module" src="/assets/index-B4cABSOM.js"></script>
```

The `<div id="root">` is empty on delivery. All content is injected by React after JavaScript executes.

Paddle's domain reviewer uses a crawler/headless tool. If it does not execute JavaScript, every policy URL it visits returns a blank page body. The reviewer cannot verify that Privacy, Terms, or Refund policies exist.

**Evidence:** Raw HTTP GET of `/privacy-policy`, `/terms`, `/refund`, `/refund-policy` all return the identical 3438-byte HTML shell. There is no policy text in the raw response.

---

### 2. `<noscript>` fallback says "New paid subscriptions are not available" (BLOCKING)

The single `<noscript>` block in `index.html` is the only static content delivered to a non-JS crawler. It contains:

> "New paid subscriptions are not available on this public page."

This appears on **every route** because the noscript block is in the root HTML shell. Paddle's reviewer sees this message on the pricing page, the homepage, the subscribe page — everywhere. This directly signals that the service is not currently selling, which is a known Paddle rejection reason.

**Evidence:** Confirmed in both the live raw HTTP response and `index.html` line 26.

---

### 3. `/subscribe` shows "Payments temporarily unavailable" (BLOCKING)

`src/pages/SubscribePage.tsx` (lines 70–74) renders:

> "Online payments are temporarily unavailable while billing is updated."

The checkout button is `disabled`. If Paddle's reviewer navigates to `/subscribe` after JavaScript renders, they see a non-functional checkout. This directly fails the requirement that users must be able to purchase a subscription.

---

### 4. AED pricing on `/subscribe` does not match USD pricing on homepage (INCONSISTENCY)

`SubscribePage.tsx` shows `AED 150 / month` and `AED 1,620 / year`. The homepage and `index.html` noscript show `$41 USD / month` and `$443 USD / year`. These are different currencies and different amounts. Paddle reviewers check that displayed pricing matches the Paddle catalog. A currency mismatch between pages is a red flag.

---

### 5. Policy pages have no static content for crawlers (SECONDARY — same as #1)

`/privacy`, `/terms`, `/refund`, `/privacy-policy`, `/refund-policy` all deliver zero policy text in their HTTP response. A crawler that doesn't run JS cannot confirm policies exist or read their content. Paddle requires Privacy Policy, Terms of Use, and Refund Policy to be "clearly accessible."

---

## What is NOT causing the rejection

- **HTTPS / TLS** — passes strict hostname/trust/revocation checks; cert valid through 2027-01-24. Not a cause.
- **HTTP routing** — all 12 tested paths return HTTP 200. Not a cause.
- **Cloudflare blocking** — no `cf-mitigated` header observed; no login/challenge redirect on public paths. Not a cause.
- **Login wall** — authenticated routes correctly return the app shell; public routes are not gated server-side. Not a cause.

---

## Summary table

| Issue | Severity | Fixable without backend change? |
|---|---|---|
| SPA shell — policy pages have no static text for crawlers | **Blocking** | Yes — SSR or static HTML policy pages |
| noscript says "subscriptions not available" on every page | **Blocking** | Yes — remove/update noscript copy |
| `/subscribe` checkout disabled with "temporarily unavailable" | **Blocking** | Only after Paddle migration complete |
| AED vs USD pricing mismatch between pages | **Blocking** | Yes — align currency/amounts |
| Policy content not in raw HTML (same as #1) | **Blocking** | Yes |

---

## Recommended fix sequence

1. **Serve policy pages as static HTML** — either SSR the policy content, or create dedicated static `.html` files for `/privacy-policy`, `/terms-of-service`, `/refund-policy` that Cloudflare Pages serves directly (no JS required). This is the single highest-impact fix.

2. **Remove the "subscriptions not available" line from `<noscript>`** — or replace it with accurate copy once checkout is enabled.

3. **Align pricing** — decide on one currency (USD per Paddle catalog) and remove the AED-only `/subscribe` page display, or show both. The Paddle catalog prices are $41/mo and $443/yr; those must match what reviewers see.

4. **Enable checkout** — complete the Paddle migration and set `PADDLE_CHECKOUT_ENABLED=true` before resubmitting. A disabled checkout during Paddle's review is a guaranteed rejection.

5. **Resubmit** only after all four above are done and verified with a no-JS HTTP probe showing policy text in the raw response.
