# Spec — Per-slug canonical pages (danmercede.online)

Status: drafting · Owner-merge · Evolves: W6 (per-entry anchors) + W9 (sitemap) from
[`aeo-body-bake-spec.md`](aeo-body-bake-spec.md); reuses the diagram render path from
[`diagram-content-type-spec.md`](diagram-content-type-spec.md).

## Problem

Today every danmercede.online entry is addressable only as a **fragment** of the single
feed page — `https://www.danmercede.online/#<slug>`. To a crawler a fragment is not a
distinct URL: Google collapses `/#<slug>` to `/`, so no entry (including the diagrams)
has its own indexable page, its own canonical, or its own page-level structured data.
The hub (danmercede.com) already solved this for essays: every essay is a real page at
`/thoughts/<slug>` with its own canonical, Article JSON-LD, and body-bake, emitted as a
static file at build time and served by Vercel filesystem precedence. This change ports
that convention to the signal feed so each entry — diagrams especially — becomes a real,
indexable page at `https://www.danmercede.online/<slug>`.

## Goal & non-goals

- **Goal:** give every compiled feed entry a real per-slug canonical page that crawlers
  (incl. Google Images, via the image sitemap) can index independently of the feed.
- **Non-goal:** SSR, a router library, or any framework migration. Build-time, browserless,
  no-React static emit only — the same posture as the existing body-bake.
- **Non-goal (this PR):** changing the feed's interactive permalink/navigation UX. The feed
  keeps working as-is; the per-slug pages are additive. (See "Flagged for follow-up".)

## Entry scope decision

**Every COMPILED entry gets a page** — the inbox+substrate set in `constants.generated.ts`
(every diagram, essay, note, etc. that Dan publishes through the pipeline). This is a
faithful port of the essay convention (no type filter — every published entry → a page)
and subsumes the diagrams (the stated driver). Accepted tradeoff: the shortest entries
(thought-snippets ≤200 words) become thin pages; this is on-brand for a "raw signal"
surface and each page still carries a title, body, tags, canonical, and structured data.

**Legacy `constants.ts` seed entries are excluded** (they stay feed-only, fragment-
addressable). They are pre-compiler demo posts that have always been excluded from the
sitemap; minting indexable pages for them would be surprise-indexing demo content and
would desync pages from the sitemap. The page set is therefore exactly the sitemap set —
`getPageEntries()` (= the compiled entries) drives both the emitter and the feed JSON-LD's
page-vs-fragment URL choice, so no structured-data URL ever points at a 404.

## Route namespace decision

**Flat `/<slug>`** (mirrors the existing feed anchor `/#<slug>`). Slugs are
`^[a-z0-9]+(?:-[a-z0-9]+)*$` and date-prefixed, so they cannot collide with reserved
static paths (`/sitemap.xml`, `/robots.txt`, `/assets/*`, `/policies.html`, `/posts.json`).

## Constraints

- **No SSR / no framework migration.** Pages are emitted by a build-time Vite plugin
  (a `writeBundle`/`closeBundle` hook), the same mechanism class as `bodyBakePlugin`.
- **Deploy truth = Vercel `vite build` output.** `dist/` is gitignored; Vercel runs
  `npm run build` (`vite build`) every deploy. `VERCEL=1` skips only the *content compile*
  (`constants.generated.ts` regen), not `vite build` — so the emitter MUST run inside
  `vite build`, not as a separate CI-only script.
- **Vercel `cleanUrls: true`, no SPA catch-all rewrite.** A page emitted at
  `dist/<slug>/index.html` is served at `/<slug>` by filesystem precedence; a slug with no
  emitted file 404s (correct — no feed-for-garbage-URLs).
- **Same committed entry source → no drift.** Pages derive from the same
  `constants.generated.ts` + legacy `constants.ts` the SPA and feed-bake use, so a page can
  never drift from what the app shows.
- **Drift-check is fail-closed on `public/sitemap.xml`.** Changing `generateSitemap()`
  requires regenerating and committing `public/sitemap.xml` in the same PR.
- **Unique body per URL.** Each per-slug page bakes ONLY that entry's `<article>` (not the
  whole feed) so no two pages share a body. On hydration the SPA renders the live feed;
  the entry is present in both the baked and hydrated DOM, so this is focus, not cloaking.

## Scenarios / acceptance criteria

Each scenario is an end-to-end slice (render fn → build artifact → served file shape).

1. **A page exists per entry.** After `VERCEL=1 npm run build`, for every compiled entry
   there is a file `dist/<slug>/index.html`. The count of emitted per-slug pages equals the
   compiled entry count.

2. **Each page is self-canonical.** Each `dist/<slug>/index.html` contains exactly one
   `<link rel="canonical" href="https://www.danmercede.online/<slug>">`, a `<title>`
   carrying the entry title, a meta description, and `og:url` =
   `https://www.danmercede.online/<slug>`.

3. **Each page carries single-entry structured data.** Each page contains exactly one
   JSON-LD block with a single `BlogPosting` whose `@id`/`url`/`mainEntityOfPage` =
   `https://www.danmercede.online/<slug>` and whose `author`/`publisher` `@id` =
   `https://www.danmercede.com/#person`. For a **diagram** entry the BlogPosting carries an
   `image` `ImageObject` with the absolute image URL + caption, and `og:image`/`twitter:image`
   are the diagram image (non-diagram pages keep the default working-portrait OG).

4. **Each page's baked body is that one entry.** Each page's `<body>` contains the entry's
   `<article id="<slug>">` with its `<h2>` title and lead text (claim/content/hypothesis/
   status per type, and `<figure><img><figcaption>` for diagrams), and contains no other
   entry's `<article>`.

5. **Sitemap lists real pages, not fragments.** `public/sitemap.xml` lists the root `/`
   plus one `<url><loc>https://www.danmercede.online/<slug></loc></url>` per entry (the
   `/#<slug>` fragment form is gone). Each diagram `<url>` keeps its `<image:image>` child
   (absolute `<image:loc>` + `<image:caption>`). Each `<lastmod>` stays the entry's own
   real backdated content date (never an every-build bump).

6. **Feed structured data points at real pages.** `renderFeedJsonLd()` BlogPosting
   `@id`/`url` (and `mainEntityOfPage`) reference `https://www.danmercede.online/<slug>`
   (the real page) rather than the `/#<slug>` fragment.

7. **Gates stay green.** `npm test`, `npm run drift-check`, and `VERCEL=1 npm run build`
   all pass; brand-token lint and the Vercel committed-bundle guard (`VERCEL=1` skips
   compile) are unaffected.

## Test seams (designed-in)

Fewest/highest seams, matching the existing architecture (pure render fns tested directly;
the Vite plugin is a thin file-writer verified via the build artifact):

- **`tests/perSlugPages.test.ts` (new) — the primary seam.** Unit-tests the pure functions
  the page emitter is built from, with no build required:
  - `renderEntryPageJsonLd(entry)` → single BlogPosting (+ ImageObject for diagrams), real
    `/<slug>` urls, hub `#person` backlinks, `<`-escaped for safe embedding.
  - `buildEntryPageHtml(shellHtml, entry)` → applies canonical/title/description/OG/JSON-LD/
    body overrides to a shell and returns page HTML; asserts criteria 2–4 on a fixture shell;
    asserts it throws (guarded, like `bodyBakePlugin`) if expected anchors are missing.
- **`tests/feedJsonLd.test.ts` (extend)** — BlogPosting `url`/`@id` now `/<slug>` (criterion 6).
- **`tests/compileContent.test.ts` (extend)** — `generateSitemap()` emits `/<slug>` loc, no
  `/#<slug>`, `<image:image>` retained for diagrams (criterion 5).
- **Build-artifact assertion** (in `perSlugPages.test.ts` or a small build test) — after a
  build, `dist/<slug>/index.html` exists per entry (criterion 1). May run against a prebuilt
  `dist/` to stay fast.

## Flagged for follow-up (NOT in this PR — surface to Dan)

- **Feed permalink → page.** The EntryCard permalink is still `#<slug>` (scrolls within the
  feed). Matching the essay convention fully would point it at `/<slug>` (click-through to
  the page) and scroll-to-entry for visitors landing on `/<slug>`. Deferred because it
  changes interactive feed UX; the indexing goal is met without it.

## Rollback

Revert the PR. Per-slug pages are additive build artifacts under gitignored `dist/`; the
sitemap `<loc>` change is reversible by reverting `generateSitemap()` + the regenerated
`public/sitemap.xml`. No 301s required — the `/#<slug>` fragments were never distinct
indexed URLs, so nothing inbound breaks. Revert if any page leaks the full feed body
(duplicate content), the committed-bundle guard regresses, or drift-check fails.
