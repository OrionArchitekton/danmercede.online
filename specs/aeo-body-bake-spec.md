# Spec — AEO body-bake + per-entry anchors (danmercede.online)

Status: implemented · Owner-merge · Rows: W6 (prerequisite), W1 (body-bake), W9 (sitemap)
MAP: `~/.orion/danmercede-brand-optimization-MAP-20260617.md` (W1/W6/W9 rows + STEP-2 prep appendix)

## Problem

The served `<body>` is an empty `<div id="root"></div>` (h1=0, p=0). Non-Google
answer engines (ChatGPT/GPTBot, Perplexity/PerplexityBot, Claude/ClaudeBot) fetch
raw HTML and do **not** execute JavaScript, so they see no content. The 32 feed
entries also have no real permalinks — the archive click handler was an
`alert()` dev stub and the EntryCard permalink was a bare `#${slug}` fragment
with no matching anchor in the DOM, so entries were neither linkable nor
crawlable.

## Constraints

- **No SSR / no framework migration.** Build-time, browserless, no-React HTML
  emit only (gated decision W1: no-SSR body-bake).
- **Deploy truth = Vercel `vite build` output.** `dist/` is gitignored; Vercel
  runs `npm run build` (`vite build`) on every deploy. The body-bake therefore
  runs inside `vite build` via a `transformIndexHtml` plugin so it lands on the
  deployed `dist/index.html`. `VERCEL=1` only skips the *content compile*
  (`constants.generated.ts` regen), not `vite build`.
- The baked block lives **inside** `<div id="root">`. React `createRoot().render()`
  replaces the root's children on hydration, so interactive users see the live
  SPA and crawlers see the baked HTML. No double-render, no flash for JS users
  beyond first paint.
- Entry content is derived from the **same committed sources** the SPA renders
  (`constants.generated.ts` + legacy `constants.ts`), so the baked body can never
  drift from what the app shows.

## Scenarios / acceptance criteria

1. **Body carries real content.** After `vite build`, `dist/index.html` `<body>`
   contains exactly one `<h1>` (site identity) and `> 0` `<p>` elements with real
   text, plus one `<article>`-level block per entry. (drift test +
   counted on the deploy artifact.)
2. **Per-entry anchors exist.** Every entry renders inside an element whose `id`
   equals its slug, both in the baked HTML and in the live React `<article>`.
   A `#${slug}` permalink resolves to that anchor.
3. **Archive navigation is real, not an alert.** Clicking an archive title sets
   the URL hash to the entry slug and scrolls to the on-page anchor (no `alert`).
4. **Each entry's title + primary text is in the baked body.** For every entry
   the baked block includes the title (`<h2>`) and at least its lead
   text (claim / content / hypothesis / status — whichever the type carries) as
   `<p>`.
5. **Sitemap lists all entries with real lastmod.** `public/sitemap.xml` (W9) is
   generated at build time from compiled entries: one `<url>` per entry as a
   `/#<slug>` fragment plus the root URL; each `lastmod` is the entry's own
   content date (never an every-build auto-bump). Root `lastmod` = newest entry
   date.
6. **No drift between baked body and committed bundle.** A test
   (`tests/bodyBake.test.ts`) renders the prerender block from the committed
   sources and asserts h1==1, p>0, and one anchor id per entry slug.
7. **Build determinism preserved.** `VERCEL=1 npm run build` still succeeds; the
   prebuild compile still skips via the D1 guard (committed bundle unchanged).

## Out of scope (deferred / not chosen)

- SSR / SSG / framework migration (gated: NO).
- A client-side router or true per-route pages (fragment anchors only this round;
  full routes are a heavier follow-up).
- Substrate compile / pin bump (P5), llms.txt serving (W10).
