# Danmercede.online Repo Contract

Date: 2026-06-30

Status: binding repo-local contract.

## Current Name

- `danmercede.online`

## Recommended Name

- `danmercede.online`

## Role

- `web`

## Purpose

`danmercede.online` is the public living-signal and working-log web surface for
Dan Mercede. It publishes short-form notes, experiments, diagrams, and status
updates through a fail-closed static authoring, compile, render, and deploy
pipeline.

It is not the primary identity hub, not the canonical publishing source, and not
a product, library, backend, API, runtime, or platform repo.

## Owns

- markdown entries in `inbox/` and raw source notes in `raw/`
- fail-closed content compilation in `scripts/compileContent.ts`
- committed generated outputs: `constants.generated.ts`, `public/posts.json`,
  sitemap, and approved static assets
- the React SPA feed, archive, tag-filter, and entry rendering surfaces
- automated draft, label, post-publish, drift-check, build, and smoke workflows
- repo-local analytics, observability, and diagram-publishing runbooks

## Does Not Own

- primary identity sites such as `danmercede.com`, `danielmercede.com`, or
  `danmercede.info`
- `dan-mercede-substrate` canonical draft and diagram origination
- business, OAC, platform, runtime, shared-infra, or governance ownership
- runtime markdown parsing, backend APIs, or deploy targets beyond the admitted
  static Vercel site
- publish state outside admitted lane/ops receipt surfaces

## Allowed Dependencies

- static React, Vite, TypeScript, Tailwind CDN, `lucide-react`, `tsx`, and
  `gray-matter`
- Vercel static hosting and GitHub Actions for admitted publishing workflows
- substrate content only through explicit compile-time ingestion and conflict
  rules
- GA4, Vercel Analytics, Speed Insights, Search Console, and prod-smoke checks as
  env-gated observability
- estate doctrine from `orion-estate-audit`

## Forbidden Logic / Forbidden Ownership

- making working-log posts canonical identity or business truth
- replacing substrate as canonical content origin
- adding backend/runtime markdown parsing or secret-bearing services
- publishing unapproved substrate diagrams or branded material by implication
- weakening compile, drift, D1/Vercel guard, smoke, or post-publish validation
- accepting unsolicited external contribution paths outside coordinated publishing

## PR Reject Rules

- reject PRs that turn this repo into the primary identity, product, API, runtime,
  or platform owner
- reject PRs that bypass compile-time validation or committed-bundle drift gates
- reject PRs that add unapproved substrate content, diagrams, or publish state
- reject PRs that weaken deploy verification, analytics gating, or Slack approval
  flow for publishing

## Verification

For docs-only contract changes:

```bash
git diff --check
```

For implementation changes, follow `AGENTS.md`: run `npm ci`, `npm test`, `npm
run drift-check`, and `VERCEL=1 npm run build` for touched publishing or app
surfaces.

## Basis

- `AGENTS.md`
- `README.md`
- `docs/runbooks/analytics-observability.md`
- `docs/runbooks/diagram-publishing.md`
- `scripts/compileContent.ts`
- `scripts/checkInboxDrift.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/post-publish.yml`
- `repos/repo_contract_registry_20260317.csv` in
  `OrionArchitekton/orion-estate-audit`
- `architecture/repo_contracts/dan_mercede_personal_brand_repo_contract_20260318.md`
  in `OrionArchitekton/orion-estate-audit`
