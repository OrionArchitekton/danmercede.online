---
verified: 2026-06-28
review_after: 2026-09-28
topics: [analytics, observability, ga4, google-analytics, search-console, gsc, vercel, speed-insights, web-vitals, llms-txt, seo, aeo, consent-mode, danmercede.online]
references:
  - components/Analytics.tsx
  - analytics/gaConfig.ts
  - .env.example
  - public/llms.txt
  - .github/workflows/prod-smoke.yml
  - specs/analytics-observability-spec.md
---

# Runbook — Analytics & Observability (danmercede.online)

Sibling of the danmercede.com runbook for the signals-log site. Instrument with
GA4, Vercel Web Analytics + Speed Insights, Google Search Console, and a synthetic
self-canonical monitor. Spec: [`specs/analytics-observability-spec.md`](../../specs/analytics-observability-spec.md).

Code ships env-gated and inert: nothing tracks until `VITE_GA_MEASUREMENT_ID` is
set in Vercel and the Vercel widgets are enabled. DNS is on **Cloudflare**; the
apex 301s to **www** (canonical host `https://www.danmercede.online/`).

## Pre-state (verified 2026-06-28)
- **GA4 / Vercel Analytics: NONE** — added here (gated, off until configured).
- **GSC: partially set up** — apex already carries one `google-site-verification`
  TXT record; a property is likely already verified. Confirm before re-verifying.

## Steps (operator — Google account / Vercel)
1. **GA4:** analytics.google.com → create/reuse a property → add a **Web** stream for
   `https://www.danmercede.online`. Copy the `G-XXXXXXXXXX` Measurement ID. (Use the
   **same** GA4 property as .com only if you want combined reporting; otherwise a
   separate property keeps the signals log isolated — recommended.)
2. **Vercel:** project **`danmercede-online`** → Settings → Environment Variables →
   add `VITE_GA_MEASUREMENT_ID = G-XXXXXXXXXX` for **Production** only (`VITE_` prefix
   required). Settings → enable **Web Analytics** and **Speed Insights**. Redeploy Production.
3. **GSC:** confirm/verify a **Domain** property `danmercede.online` (TXT token already
   present). If a new token is needed, add it in **Cloudflare** DNS (TXT, name `@`).
   *(I can add it via the Cloudflare API once you paste the token.)* Then **Sitemaps**
   → submit `https://www.danmercede.online/sitemap.xml`.

## Validation
- **Gated-off:** env-less preview shows no `googletagmanager.com/gtag/js` request.
- **Live:** GA4 → Realtime shows your session; clicking entries (hash changes) emits
  additional `page_view`s with the `#<slug>` path. End-to-end ALLOW proof, not "script present".
- **Vercel:** Analytics + Speed Insights tabs populate within ~30 min of traffic.
- **Monitor:** Actions → **Prod Smoke** → Run → green with `canonical=<self>` logged.
- **GSC:** Sitemaps "Success"; impressions accrue over days.

## Rollback
- Unset `VITE_GA_MEASUREMENT_ID` in Vercel Production → redeploy → no-op. Or revert the PR.

## Notes / hazards
- WARNING: GA4 runs **without a cookie-consent banner** (Consent Mode v2 defaults).
- INFO: the smoke canonical check is **www-tolerant** (apex 301s to www); a soft-404
  still fails because it mismatches on **path** (canonicals to `/`).
- INFO: `public/llms.txt` is hand-maintained; refresh when the site's surface changes.
