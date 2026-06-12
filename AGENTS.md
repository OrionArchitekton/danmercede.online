# AGENTS.md — danmercede-online

## Repo Role

Canonical clone of the **danmercede.online** living-signal web surface: a
public working log of short-form notes, experiments, and status updates.
Vite 6 + React 19 + TypeScript SPA; content is compiled at build time from
`inbox/*.md` by tsx scripts — no backend, no runtime markdown parsing.
Hosted on Vercel serving the committed bundle: with `VERCEL=1` the prebuild
compile skips via the D1 guard and vite builds the committed
`constants.generated.ts` (Spec 4b).

## Owns

- `inbox/` markdown entries (the PR surface) and `raw/` input notes
- `scripts/compileContent.ts` — fail-closed validation and compilation
- `scripts/checkInboxDrift.ts` — committed-bundle drift gate
- committed compiler output: `constants.generated.ts`, `public/posts.json`
- the SPA (`App.tsx`, `components/`) and the automated publishing workflows
  under `.github/workflows/`

## Does Not Own

- primary identity sites (danmercede.com, danielmercede.com,
  danmercede.info) — this repo does not replace or duplicate them
- the `dan-mercede-substrate` canonical publishing source; the compiler
  reads it fail-open and substrate wins on slug conflict

## Start Here

- [README.md](README.md) — stack, content types, publishing architecture, deploy
- [scripts/compileContent.ts](scripts/compileContent.ts) — compiler + Vercel D1 guard
- [scripts/checkInboxDrift.ts](scripts/checkInboxDrift.ts) — drift gate
- [.github/workflows/ci.yml](.github/workflows/ci.yml) — PR gate: test, drift-check, `VERCEL=1` build
- [.github/workflows/draft-builder.yml](.github/workflows/draft-builder.yml) — draft automation
- [.github/workflows/post-publish.yml](.github/workflows/post-publish.yml) — live-deploy slug verification
- [tests/compileContent.test.ts](tests/compileContent.test.ts)
- [tests/vercelGuard.test.ts](tests/vercelGuard.test.ts)

## Validation

Verified in this checkout (Node 20 per CI; install from the committed
lockfile first):

```bash
npm ci
npm test                 # tsx --test compileContent + vercelGuard
npm run drift-check      # inbox-drift gate (CI sets TZ=America/Los_Angeles)
VERCEL=1 npm run build   # CI production path; prebuild compile skips via D1 guard
```

Declared by package.json — not verified in this change: `npm run compile`
(regenerates the committed bundle; commit its output), `npm run dev`,
`npm run preview`, plain `npm run build`.

## Estate Authority

- Estate doctrine: `platform/orion-estate-audit/AGENTS.md` (orion-estate tree)
- Registry: `platform/orion-estate-audit/estate_home_registry.yaml`,
  logical_id `personal-brand-dan-mercede-danmercede-online`
- Repo contract: orion-estate-audit
  `architecture/repo_contracts/dan_mercede_personal_brand_repo_contract_20260318.md`
