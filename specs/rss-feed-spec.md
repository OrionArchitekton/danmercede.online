# Spec — Site-owned RSS/Atom feed (danmercede.online)

Status: drafting · Owner-merge · Supersedes the lane-rendered static feed
(dan-mercede-lane `tools/render_rss.py`, deployed 2026-06-15 via PR #25) for THIS
surface. Recorded divergence: the lane-flywheel spec (Phases 5/8/9) made the lane the
feed owner, but signals live in this repo's `inbox/` where the lane renderer cannot
see them; the operator approved site ownership 2026-07-09 (bottom-of-funnel hub goal,
feeds are top-of-funnel intake). The lane renderer remains the candidate engine for a
future danmercede.com essays feed.

## Problem

The live `feed.xml` was last generated 2026-06-15, carries two danmercede.com essay
items and zero signals, and nothing regenerates it when a signal publishes. The site
has no feed autodiscovery tag, so readers and crawlers cannot find the feed from any
page. Answer-engine crawlers that poll feeds for freshness see a dead surface.

## Goal & non-goals

- **Goal:** every published signal appears in `feed.xml` (RSS 2.0) and `atom.xml`
  (Atom 1.0) automatically, with full content, working per-entry permalinks, WebSub
  hub declaration, autodiscovery, and a post-publish hub ping.
- **Non-goal:** a danmercede.com essays feed (queued separately); dev.to/Hashnode
  import configuration (operator dashboard action); any change to signal authoring
  or the SPA runtime.
- **Scope amendment (review-driven):** compile gained a fail-closed shrink guard:
  a recompile whose entry count drops below the committed `posts.json` count
  aborts before any write unless `ALLOW_CONTENT_SHRINK=1` (adversarial finding:
  the fail-open substrate read could silently truncate every committed artifact,
  self-consistently passing the feed drift test).

## Scenarios (tracer bullets)

1. **Signal publish refreshes the feed.** A new `inbox/*.md` merges → `npm run
   compile` (prebuild) regenerates `public/feed.xml` + `public/atom.xml` with the new
   signal as the newest item. Committed artifacts; Vercel serves them statically.
2. **Feed items are self-describing.** Each item carries: title; `link` and permalink
   `guid` at the entry's canonical URL (per-slug page when one exists, feed fragment
   otherwise); RFC-822 UTC `pubDate` derived from the entry's PT date+timestamp; a
   per-type plain-text summary as `description` (claim / hypothesis / what-changed /
   caption / content lead, truncated ~280 chars); full article HTML in
   `content:encoded` (Atom: `summary` + full `content type="html"`).
3. **Discovery surfaces can find and subscribe.** `index.html` head (inherited by all
   per-slug pages) carries `rel="alternate"` autodiscovery links for both feeds. Both
   feeds declare `rel="self"` and `rel="hub"` (Google WebSub hub). `/rss.xml`
   redirects to `/feed.xml` (matching the existing `/rss` redirect).
4. **Publish pushes, not just polls.** After a published-labeled PR merges,
   post-publish CI POSTs `hub.mode=publish` for both feed URLs to the WebSub hub;
   ping failure is non-blocking (WARNING, not a gate).

## Constraints

- Deterministic given content: `lastBuildDate`/`updated` derive from the newest
  entry, never the wall clock, so re-running compile on unchanged content is a no-op
  diff (temporal hygiene consistent with the drift gate's spirit).
- Feed is a pure projection of the same ordered-entry source the bake and JSON-LD
  use (`getOrderedEntries`, `entryArticleHtml`, `entryCanonicalUrl`), so feed content
  cannot drift from what the site renders.
- All URLs use the `https://www.danmercede.online` canonical host.
- Newest 20 entries; all strings XML-escaped; no new dependencies.

## Test seams (decided here, not deferred)

Single seam: `scripts/renderFeed.ts` module exports (`renderRss`, `renderAtom`) fed
by injected entry lists — the same seam pattern `feedJsonLd.test.ts` uses on
`renderFeedJsonLd`. CI's existing gate (test + drift + `VERCEL=1` build) exercises
the wiring; no new gate.

## Acceptance criteria

- [ ] `npm run compile` emits both feeds; newest inbox signal is item 1.
- [ ] Items: canonical-host permalink guid, RFC-822 UTC dates (PDT/PST correct),
      full-content `content:encoded`, claim as description.
- [ ] Both feeds: `rel="self"` + `rel="hub"`; head has both autodiscovery links.
- [ ] `/rss.xml` → `/feed.xml` permanent redirect.
- [ ] post-publish workflow pings the hub for both feeds, non-blocking.
- [ ] Unchanged content → byte-identical feeds on recompile.
