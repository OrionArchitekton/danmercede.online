# Diagram Content Type Spec

## Scope

This change adds a first-class diagram content type to `danmercede.online` for the approved MAP set in the internal `danmercede-diagram-feed-MAP-20260618.md` ops note, section 0.

The approved set is exactly 21 diagram rows. Company-branded diagrams, `qa_slides` sales-stat slides, NotebookLM-watermarked slides, and all MAP-benched rows stay out of scope.

## Contract

- Substrate canonical type `diagram` maps to consumer type `EntryType.Diagram`.
- A diagram canonical must provide `asset_path`, `alt_text`, `caption`, `tags`, `surface_targets` containing `danmercede.online`, and `status: canonical`.
- The consumer copies each substrate asset from `publishing/assets/<slug>/` to `public/assets/diagrams/<slug>.<ext>` during local compile.
- The Vercel build path remains guarded by `VERCEL=1`; deploys serve the committed bundle and do not recompile from substrate.
- Diagram entries render as `<figure>` with `<img>` and `<figcaption>` in both the React surface and the prerendered body.
- Diagram BlogPosting JSON-LD includes an `ImageObject` with absolute image URL and caption.
- `public/sitemap.xml` includes image sitemap children for diagram entries and keeps each entry's real backdated `lastmod`.
- Brand-token lint rejects diagram identity fields containing `cosmocrat`, `oia`, `oac`, `oam`, `oiac`, `orion intelligence`, `replyby`, `auxo`, or `ats`.

## Acceptance Criteria

- `public/posts.json` contains exactly 21 `type: "diagram"` entries from the approved MAP rows.
- `constants.generated.ts` contains each diagram entry with `EntryType.Diagram`, `src`, `alt`, and `caption`.
- `public/assets/diagrams/` contains exactly the 21 approved diagram assets.
- The sitemap contains one `<image:image>` child per diagram entry.
- `renderPrerenderBody()` emits crawlable figure markup for diagram entries.
- `renderFeedJsonLd()` emits `ImageObject` for diagram entries and continues to reference `https://www.danmercede.com/#person`.
- `npm test`, `npm run drift-check`, and `VERCEL=1 npm run build` pass.

## Rollback Criteria

Revert the consumer PR if any diagram asset is branded, any unapproved MAP row appears in `posts.json`, diagram rendering breaks the feed layout, or the Vercel committed-bundle guard no longer holds.
