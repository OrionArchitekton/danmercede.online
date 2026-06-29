# Analytics & Observability — Spec (danmercede.online)

## Problem
danmercede.online (the living signals log) publishes continuously but ships **no
instrumentation**: no traffic analytics, no Core Web Vitals, no synthetic check
that the served page self-identifies. It is a single-page Vite SPA on Vercel whose
entries are `#<slug>` hash fragments sharing one indexable URL, with per-slug
static pages at `/<slug>`. This is the sibling of the danmercede.com change and
follows the same shape.

## Approach (chosen)
Instrument from the **app layer**, env-gated, no measurement id committed:
- **Google Analytics 4** via a React `<Analytics>` component gated on
  `import.meta.env.VITE_GA_MEASUREMENT_ID`; absent/blank/malformed → no-op. Consent
  Mode v2 (analytics granted, ad signals denied, IP anonymized), `send_page_view:false`.
  No router here, so a `page_view` fires on mount and on each `hashchange` (which
  signal is being read), not via route changes.
- **Vercel Web Analytics + Speed Insights** (cookieless), gated on the same
  production-only `VITE_GA_MEASUREMENT_ID` switch as GA4 — mount nothing on dev/preview.
- **AEO**: `public/llms.txt` advertising the signals feed and backlinking the
  canonical danmercede.com hub/#person identity (this site defines no Person node).
- **Synthetic observability**: the existing daily `prod-smoke` monitor also asserts
  the served self-canonical resolves to the requested URL — **www-tolerant**, since
  the apex 301s to www (so apex↔www is the same site) while a soft-404 still
  mismatches on path.

## Single source of truth
`analytics/gaConfig.ts` (`resolveGaConfig`) — identical to the .com sibling — is the
one place that decides whether GA runs and with what consent/config. Tested.

## Scope
- **In:** `analytics/gaConfig.ts`, `components/Analytics.tsx`, `@vercel/*` deps (+lockfile),
  `public/llms.txt`, `.env.example`, `vite-env.d.ts`, the `prod-smoke.yml` canonical
  assertion, tests, runbook, this spec; `<Analytics/>` mounted once in `App`.
- **Out:** the SEO `<head>`, `bodyBakePlugin`/`perSlugPagesPlugin`, `vercel.json`
  routing; the inbox/substrate content + `drift-check` contract; cookie banner; GA/GSC
  property creation (operator-only).

## Acceptance criteria
1. With no `VITE_GA_MEASUREMENT_ID`, the served site loads gtag zero times.
2. With a valid `G-XXXX` id, gtag loads once, the consent default is set
   (analytics granted, ad signals denied), and a `page_view` fires on mount and on
   each `hashchange`.
3. `resolveGaConfig` returns null for malformed ids, a correct config otherwise.
4. ALL instrumentation (GA4 + Vercel Web Analytics + Speed Insights) is gated on
   `VITE_GA_MEASUREMENT_ID`: dev/preview mount nothing; production mounts all three once.
5. `public/llms.txt` exists, begins with `# Dan Mercede`, advertises the .online
   origin, and backlinks the .com hub + `#person`.
6. The daily monitor fails if the served self-canonical does not resolve to the
   requested URL (www-tolerant; soft-404 still fails on path).
7. Existing tests, `drift-check`, `npm ci`, and `npm run build` all remain green.

## Test seams
- **Unit (node `tsx --test`):** `resolveGaConfig` + `llms.txt` shape — `tests/analytics.test.ts`.
- **Synthetic (CI cron):** `prod-smoke.yml` self-canonical assertion against live prod.

## Rollout / verification / rollback
- **Rollout:** merge → set `VITE_GA_MEASUREMENT_ID` (Production) in the Vercel
  project → redeploy; enable Web Analytics + Speed Insights; submit the sitemap in GSC.
- **Verify:** GA4 Realtime shows the session; no gtag on an env-less preview;
  `prod-smoke` green with the canonical assertion.
- **Rollback:** unset the env (instant no-op) and/or revert. No data/routing change.
