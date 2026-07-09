---
verified: 2026-07-09
review_after: 2026-10-09
topics: [rss, atom, feed, websub, pubsubhubbub, syndication, autodiscovery, aeo, danmercede.online]
references:
  - scripts/renderFeed.ts
  - scripts/prerenderBody.ts
  - tests/feed.test.ts
  - .github/workflows/post-publish.yml
  - specs/rss-feed-spec.md
  - vercel.json
---

# Runbook: RSS/Atom feed freshness (danmercede.online)

## How it works

`npm run compile` (the prebuild) runs `scripts/renderFeed.ts` after
`compileContent.ts`, emitting committed `public/feed.xml` (RSS 2.0) and
`public/atom.xml` (Atom 1.0) from the same ordered-entry source the site
renders. Vercel serves the committed files (D1 guard skips regeneration with
`VERCEL=1`). After a published-labeled PR merges, post-publish CI POSTs a
WebSub publish ping for both feed URLs to `https://pubsubhubbub.appspot.com/`
(non-blocking; failures surface as workflow warnings).

## Rollout

Merge regenerates nothing by itself: the feeds ship as committed artifacts in
the PR. Verify after deploy:

```bash
curl -s https://www.danmercede.online/feed.xml | grep -m1 lastBuildDate
curl -s -o /dev/null -w '%{http_code}\n' https://www.danmercede.online/rss.xml   # 308 -> /feed.xml
```

`lastBuildDate` must match the newest entry's timestamp (UTC), NOT the deploy
time; the feed is deterministic from content.

## Monitoring / validation

- Feed validity: https://validator.w3.org/feed/check.cgi?url=https%3A//www.danmercede.online/feed.xml
- WebSub ping result: the `Ping WebSub hub` step in the post-publish workflow
  run log (204 = accepted).
- Staleness check: newest `inbox/*.md` slug should be item 1 in the live feed.

## Failure modes / recovery

- **Feed stale after a signal publish:** the PR that added the signal did not
  commit regenerated feeds. Run `npm run compile` locally and commit the
  `public/feed.xml` + `public/atom.xml` diff.
- **Substrate entries missing (count drop in posts.json / sitemap / feed):**
  compile ran without a reachable substrate. The compiler reads
  `dan-mercede-substrate` FAIL-OPEN: no sibling checkout and no
  `SUBSTRATE_PATH` means substrate entries silently vanish from ALL committed
  artifacts, and the inbox-only drift gate still passes. In a worktree, always
  run `SUBSTRATE_PATH=<canonical substrate home> npm run compile`, and diff
  `posts.json`'s `count` against HEAD before committing.
- **Hub ping failing repeatedly:** subscribers fall back to polling; no user
  impact. Re-ping manually:
  `curl -X POST https://pubsubhubbub.appspot.com/ -d hub.mode=publish --data-urlencode hub.url=https://www.danmercede.online/feed.xml`

## Rollback

Revert the PR; the previous committed feeds ship on the next deploy. No state
outside the repo except hub subscriptions, which expire on their own lease.
