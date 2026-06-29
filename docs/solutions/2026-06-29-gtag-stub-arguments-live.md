---
title: "gtag stub arguments form live verification"
status: "live-verified"
date: "2026-06-29"
review_after: "2026-07-29"
topics:
  - analytics
  - ga4
  - google-tag-manager
  - production-verification
  - danmercede.online
references:
  - analytics/gaConfig.ts
  - components/Analytics.tsx
  - tests/analytics.test.ts
  - docs/runbooks/analytics-observability.md
  - specs/analytics-observability-spec.md
---

# gtag stub arguments form live verification

## Summary

PR #75 fixed the `danmercede.online` Google Analytics bootstrap so the local
`gtag` stub pushes the canonical `arguments` object into `window.dataLayer`
instead of pushing a plain JavaScript array. The regression was merged at
`2026-06-29T05:02:50Z` as merge commit
`65db2435ef98570319e6c70242a8ce7ab4fa9e33`.

The fix is live in production. On `2026-06-29`, the served
`https://www.danmercede.online/` HTML referenced
`/assets/index-Ch_7EDU8.js`; that production bundle contains measurement id
`G-Q2L2BY8RD9`, installs `window.dataLayer`, and pushes `arguments` through the
stub before emitting consent, `js`, config, and `page_view` commands. The
corresponding Google Tag Manager script
`https://www.googletagmanager.com/gtag/js?id=G-Q2L2BY8RD9` returned HTTP 200.

## Root Cause

The first analytics implementation used rest parameters and pushed the rest
array into `dataLayer`:

```ts
const gtag = (...args) => {
  window.dataLayer!.push(args);
};
```

`gtag.js` processes command entries shaped like the `arguments` object produced
by Google's shipped stub. A plain array can look equivalent in local code, but
the runtime ignores it, so consent/config/event commands never apply and GA4
collection can stay silent even though the loader script is present.

## Resolution

- `analytics/gaConfig.ts` owns `createGtag()`, a small helper that initializes or
  reuses `dataLayer` and pushes the canonical `arguments` object.
- `components/Analytics.tsx` installs that helper before consent, config, and
  manual SPA `page_view` emission.
- `tests/analytics.test.ts` asserts the dataLayer entry is not an array and that
  an existing dataLayer is reused.
- `docs/runbooks/analytics-observability.md` remains the operator runbook for
  rollout, monitoring, validation, and rollback.

## Verification

PR verification:

- PR #75 CI passed.
- The PR merged via commit `65db2435ef98570319e6c70242a8ce7ab4fa9e33`.

Production verification:

- `curl -sL https://www.danmercede.online -o /tmp/danmercede-online.html`
- `rg -o '/assets/index-[A-Za-z0-9_-]+\\.js' /tmp/danmercede-online.html`
  returned `/assets/index-Ch_7EDU8.js`.
- `curl -sL https://www.danmercede.online/assets/index-Ch_7EDU8.js -o /tmp/danmercede-online-index.js`
- `rg 'G-Q2L2BY8RD9|dataLayer\\.push\\(arguments\\)|gtag/js\\?id|page_view' /tmp/danmercede-online-index.js`
  found the live measurement id, `dataLayer.push(arguments)`, the GTM loader,
  and manual `page_view` emission.
- `curl -I 'https://www.googletagmanager.com/gtag/js?id=G-Q2L2BY8RD9'`
  returned HTTP 200 from Google Tag Manager.

## Durable Lesson

Analytics bootstraps are protocol adapters, not harmless shims. Unit tests must
assert the exact wire shape consumed by the third-party runtime, and production
verification must inspect the served bundle plus the external loader path. A
page that contains a GA measurement id or loads `gtag.js` has not proven that
the runtime accepted the commands.
