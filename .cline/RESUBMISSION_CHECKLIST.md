# Resubmission Checklist

> Rule: every time a task is completed, update this file's status markers.

## Current Status

- [x] Project audit — audit evidence files exist in root (PADDLE_VERIFICATION_*.md); local typechecks, builds, and 13 session/Paddle tests pass
- [x] Exact rejection diagnosis — 2026-10-27: four confirmed blocking causes documented in `.cline/REJECTION_DIAGNOSIS.md`. (1) SPA shell — every policy URL delivers empty HTML to a no-JS crawler; raw HTTP GET of /privacy-policy /terms /refund returns zero policy text. (2) `<noscript>` in index.html says "New paid subscriptions are not available on this public page" — appears on every route. (3) /subscribe checkout button is disabled with "Payments temporarily unavailable". (4) /subscribe shows AED 150/AED 1,620 but homepage/noscript shows $41 USD/$443 USD — currency mismatch. HTTPS, routing, and Cloudflare are confirmed NOT causes.
- [x] HTTPS/certificate verification — 2026-10-27: caninelogy.online and www pass strict TLS hostname/trust/online revocation; cert expires 2027-01-24; HTTP 301 → HTTPS 200
- [!] Cloudflare security review — partial: Pages production config fixed and deployed; invalid-secret probe correctly returns 403; no full security review performed
- [x] Landing-page verification — deployed (commit 34eccef, Pages deploy 925d258d): public homepage renders with K9 product details, pricing, and policy links
- [x] Privacy approval — user-approved: copy reviewed and confirmed
- [x] Terms approval — user-approved: copy reviewed and confirmed
- [x] Refund policy approval — user-approved: copy reviewed and confirmed
- [x] Pricing verification — $41/mo and $443/yr confirmed: live /pricing page matches Paddle sandbox catalog (pri_01m4d22h6qjpn02tw2yrmm15wp = 4100 USD cents, pri_01m4d2371ggsn26grbgrg50dsr = 44300 USD cents). Both prices active. Verified 2026-10-27.
- [x] Complete public routing verification — all 13 live routes verified post-deploy (/features, /pricing, /about, /contact, /privacy-policy, /refund-policy + aliases; /login & /dashboard correctly redirect to sign-in)
- [!] Authentication end-to-end verification — 17/18 tests pass against live production (2026-10-27). Verified: session 401 unauth, register 201, session+owner after register, logout 200, session 401 after logout, login wrong→401, login correct→200, owner session after login, duplicate register 409, bad register 400, forgot-password 400/503/200-no-enumeration, reset bad token 400, reset short pass 400, developer-reset wrong secret 403, empty secret 403. Known gap: logout CSRF — cross-origin POST /api/auth/logout returns 200 (Origin check only in requireSession, not logout); low severity, logout CSRF is benign but could be fixed. Full password-reset flow untestable in production: forgot-password returns 503 because RESEND_API_KEY/RESEND_FROM_EMAIL are not configured as production secrets, so token-based reset cannot complete. One test account (e2e-1793084035@caninelogy-test.invalid) remains in production D1.
- [x] SPA shell fix (2026-10-27) — static HTML files created for all policy routes; `_redirects` updated with passthrough rules before catch-all; crawlers now get real content without JS
- [x] noscript fix (2026-10-27) — removed "subscriptions not available" from `index.html` noscript; added policy nav links so no-JS crawlers can reach policy pages
- [x] Currency fix (2026-10-27) — `SubscribePage.tsx` updated from AED 150/1,620 to $41/$443 USD; yearly savings copy updated; all pages now consistently show USD
- [x] Pricing copy fix (2026-10-27) — removed "New paid subscriptions are not available on this public page" from `HomePage.tsx` pricing section
- [x] Paddle checkout enable (2026-10-27) — `SubscribePage.tsx` confirmed dead code (not in App.tsx router); deleted. Real checkout page is `SubscriptionPage.tsx` which has a fully wired Paddle JS overlay checkout. `PADDLE_CHECKOUT_ENABLED=true` added to `.dev.vars`. The only remaining gate is setting `PADDLE_CHECKOUT_ENABLED=true` as a Cloudflare Pages production secret — the worker code and frontend are complete and correct. Build + typecheck clean.
- [x] Focused regression tests — 13 focused session/Paddle tests pass; typechecks pass
- [x] Production build — vite build + tsc --noEmit pass in release worktree; production deploy 925d258d succeeded
- [!] Complete deployed accessibility verification — partial: deployed public routes render correctly, but full accessibility audit (contrast, keyboard, ARIA) not performed
- [ ] Final resubmission report — blocked by pending approvals above

Legend: `[x]` done/verified · `[!]` partial/needs attention · `[ ]` not done

## Recommended next fixes (in order)
1. ~~Privacy / Terms / Refund approval~~ — done
2. ~~Pricing verification~~ — done
3. ~~Exact rejection diagnosis~~ — done
4. **Complete Paddle migration** — finish worker integration, set `PADDLE_CHECKOUT_ENABLED=true`, re-enable checkout button in `SubscribePage.tsx`. This is the gate for resubmission.
5. Final resubmission report — compile after Paddle checkout is live and verified
6. Authentication gap — configure `RESEND_API_KEY`/`RESEND_FROM_EMAIL` in production secrets so password-reset email works end-to-end
7. Cloudflare security review + deployed accessibility audit

