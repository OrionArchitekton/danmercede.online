---
verified: "2026-06-18"
review_after: "2026-09-18"
topics:
  - "diagram-content-type"
  - "substrate-sync"
  - "danmercede.online"
references:
  - "specs/diagram-content-type-spec.md"
  - "scripts/compileContent.ts"
  - "scripts/prerenderBody.ts"
  - "components/EntryCard.tsx"
  - "public/posts.json"
  - "public/sitemap.xml"
---

# Diagram Publishing Runbook

## Purpose

Publish approved Dan Mercede diagram canonicals from `dan-mercede-substrate` into the `danmercede.online` working log without widening the content set beyond the approved MAP rows.

## Rollout

1. Promote diagram drafts in `dan-mercede-substrate` through `python -m tools.validate` and `python -m tools.promote`.
2. In `danmercede.online`, compile with `SUBSTRATE_PATH` pointing at the reviewed substrate checkout.
3. Confirm `public/posts.json` has 21 diagram entries and no unapproved diagram slugs.
4. Commit `constants.generated.ts`, `public/posts.json`, `public/sitemap.xml`, and `public/assets/diagrams/`.
5. Run `npm test`, `npm run drift-check`, and `VERCEL=1 npm run build`.
6. Merge only after PR checks and review threads are resolved.

## Monitoring

- Check `/posts.json` for the 21 diagram slugs after deploy.
- Check `/sitemap.xml` for 21 `<image:image>` nodes.
- Check the rendered feed HTML for `<figure>`, `alt`, `figcaption`, and `ImageObject`.
- Confirm live bundle output matches the committed bundle path by relying on the `VERCEL=1` guard and the drift-check gate.

## Validation

Use these local checks before merge:

```bash
npm test
npm run drift-check
VERCEL=1 npm run build
jq '[.posts[] | select(.type=="diagram")] | length' public/posts.json
grep -c '<image:image>' public/sitemap.xml
```

Expected counts are 21 for both the `jq` and `grep` checks.

## Rollback

Revert the `danmercede.online` PR if a branded diagram reaches the bundle, if any non-approved diagram appears, or if the figure, sitemap, JSON-LD, or Vercel guard checks fail. Reverting the consumer PR removes diagram rendering and the committed assets from the live surface without modifying substrate canonicals.
