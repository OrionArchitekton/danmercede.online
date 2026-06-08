# danmercede.online

Living signal surface.

This repository hosts the source for **danmercede.online**, a public working log used to publish short-form notes, experiments, and status updates related to systems architecture, governance, execution, and failure modes.

**Live site:** https://danmercede.online (canonical https://www.danmercede.online)

---

## Purpose

This site exists to surface **work-in-progress thinking**.

It is intentionally:
- Not polished
- Not canonical
- Not comprehensive

Posts represent provisional ideas, experiments, and operational observations shared in real time.

---

## Stack

- Vite 6 + React 19 + TypeScript 5.8 single-page app
- Tailwind CSS (via CDN), `lucide-react` icons
- `gray-matter` for build-time frontmatter parsing
- Content compiled by `tsx scripts/compileContent.ts`
- Hosted on Vercel; publishing automated via GitHub Actions (Node 20)

There is no backend and no runtime markdown parsing in this repository. Content is validated and compiled to static TypeScript at build time.

---

## Content Types

The site publishes the following entry types:

| Type | Frontmatter Slug | Required Fields |
|------|------------------|-----------------|
| Short Essay | `short-essay` | `claim` (`implication` optional) |
| Experiment Log | `experiment-log` | `hypothesis`, `constraint`, `result`, `resultDetails`, `nextStep` |
| Status Update | `status-update` | `status`, `whatChanged`, `whatBroke`, `nextStep` |
| Thought Snippet | `thought-snippet` | `content` (max 200 words) |
| Working Note | `working-note` | `content`, `openQuestion` |

Each post is timestamped and tagged. No retroactive editing.

---

## Local Development

```bash
npm install
npm run compile    # generates constants.generated.ts (required for dev server)
npm run dev        # vite dev server on http://localhost:3000 (host 0.0.0.0)
```

Other commands:

```bash
npm run compile    # tsx scripts/compileContent.ts -> constants.generated.ts + public/posts.json
npm run build      # runs compile via the prebuild hook, then vite build
npm run preview    # serve the production build locally
```

`npm run build` automatically runs `npm run compile` first via the npm `prebuild` hook, so the generated content is always rebuilt before a production build.

---

## Publishing Architecture

This site uses a static authoring → compile → render flow:

1. **Authoring** — Markdown files in `inbox/` with YAML frontmatter
2. **Compilation** — `scripts/compileContent.ts` validates each entry and generates typed output
3. **Render** — `App.tsx` merges the generated entries with a hand-written legacy set (`constants.ts`, 10 entries) and presents Feed / Archive / Tag-filter views. No runtime markdown parsing.

### Directory Structure

```
raw/                     # Human-written raw notes (input to automation)
inbox/                   # Markdown drafts with frontmatter (the PR surface)
scripts/                 # compileContent.ts
components/              # React components
public/                  # Static assets + generated posts.json
constants.ts             # Hand-written legacy entries (10), merged at render
constants.generated.ts   # Compiler output (typed LogEntry[]), repo root
App.tsx                  # SPA root: merge, sort, filter, render
```

### Compiler Output

`scripts/compileContent.ts` reads `inbox/*.md` and writes:

- `./constants.generated.ts` (repo root) — typed `LogEntry[]` consumed by `App.tsx`
- `./public/posts.json` — a flat index used for post-publish verification

### Frontmatter Schema

```yaml
---
slug: "2026-01-23-example-post"
title: "Post Title"
date: "2026-01-23T08:10:00-08:00"  # ISO 8601 with timezone
type: "short-essay"                 # Enum-safe slug
context: "systems"                  # Optional: governance, systems, infra,
                                    #   execution, signal, failure-modes
tags: ["systems", "governance"]     # Max 3 from allowed list
claim: "Core assertion"             # Type-specific fields...
implication: "Closing line"         # Optional for short-essay
---
Optional body content (rarely used).
```

The `context` field also accepts extended classifier values (`docs`, `project`, `general`, `track`, `track:*`) in addition to the standard set above.

### Validation (Fail-Closed)

`scripts/compileContent.ts` enforces:
- Valid type and context slugs
- Max 3 tags from the allowed list
- Required fields by type
- No forbidden content (client names, financial claims, marketing language)

**If validation fails, the build fails.** No partial outputs are written.

---

## Automated Publishing

Publishing is automated by three GitHub Actions workflows. The repository is, in practice, driven by these automated PRs — direct external PRs are not accepted (see Notes).

- **`draft-builder.yml`** — runs on a weekly schedule (Monday) and on manual dispatch. It takes the newest note in `raw/`, turns it into a frontmatter draft (optionally via an internal drafting service when configured), opens a `draft/<slug>` pull request, and posts Slack approval buttons (Approve / Needs-Edit / Reject).
- **`github-label-fallback.yml`** — when a `draft` PR is labeled `approved`, squash-merges it and applies a `published` label.
- **`post-publish.yml`** — after merge, waits for the Vercel deploy, then verifies the post's slug appears in the live `posts.json` at https://danmercede.online and notifies Slack.

All credentials (Slack token, channel ID, the optional drafting service URL) are supplied through GitHub Actions secrets. None are committed to this repository.

---

## Deploy

Hosted on Vercel. Merges to the default branch trigger a Vercel build (`npm run build`, which compiles content first). The `post-publish.yml` workflow then verifies the deploy by checking the published slug against the live `posts.json`.

---

## Canonical References

- Primary identity site: https://danmercede.com
- Long-form biography: https://danielmercede.com
- Identity verification: https://danmercede.info
- LinkedIn: https://www.linkedin.com/in/danmercede

This repository does not replace or duplicate content from those sources.

---

## Notes

This repository is not a product, library, or API.

Unsolicited issues, pull requests, and feature requests are not accepted. Publishing flows through the automated draft-and-approval pipeline described above; external contributions are accepted only when explicitly coordinated.

© 2026 Dan Mercede
