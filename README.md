# danmercede.online

Living signal surface.

This repository hosts the source for **danmercede.online**, a public working log used to publish short-form notes, experiments, and status updates related to systems architecture, governance, execution, and failure modes.

---

## Purpose

This site exists to surface **work-in-progress thinking**.

It is intentionally:
- Not polished
- Not canonical
- Not comprehensive

Posts represent provisional ideas, experiments, and operational observations shared in real time.

---

## Content Types

The site publishes the following entry types:

| Type | Frontmatter Slug | Required Fields |
|------|------------------|-----------------|
| Short Essay | `short-essay` | `claim`, `implication` |
| Experiment Log | `experiment-log` | `hypothesis`, `constraint`, `result`, `resultDetails`, `nextStep` |
| Status Update | `status-update` | `status`, `whatChanged`, `whatBroke`, `nextStep` |
| Thought Snippet | `thought-snippet` | `content` (max 200 words) |
| Working Note | `working-note` | `content`, `openQuestion` |

Each post is timestamped and tagged. No retroactive editing.

---

## Publishing Architecture (Hybrid Model)

This site uses a **hybrid publishing model**:

1. **Authoring** — Markdown files in `/inbox/` with YAML frontmatter
2. **Compilation** — `compileContent.ts` validates and transforms to TypeScript
3. **Runtime** — Static TypeScript arrays, no runtime markdown parsing

### Directory Structure

```
/raw/       # Human-written raw notes (input)
/inbox/     # Conductor-generated markdown drafts (PR surface)
```

### Frontmatter Schema

```yaml
---
slug: "2026-01-23-example-post"
title: "Post Title"
date: "2026-01-23T08:10:00-08:00"  # ISO 8601 with timezone
type: "short-essay"                 # Enum-safe slug
context: "systems"                  # Optional: governance, systems, infra, execution, signal
tags: ["systems", "governance"]     # Max 3 from allowed list
claim: "Core assertion"             # Type-specific fields...
implication: "Closing line"
---
Optional body content (rarely used).
```

### Validation (Fail-Closed)

The `compileContent.ts` script enforces:
- Valid type and context slugs
- Max 3 tags from allowed list
- Required fields by type
- No forbidden content (client names, financial claims, marketing language)

**If validation fails, the build fails.** No partial outputs.

### Build Commands

```bash
npm run compile  # Validate and generate TypeScript
npm run build    # Full build (includes compile as prebuild)
```

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

Issues, pull requests, and feature requests are not accepted unless explicitly coordinated.

---

© 2026 Dan Mercede
