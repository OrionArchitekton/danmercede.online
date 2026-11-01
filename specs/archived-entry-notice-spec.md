# Spec: Archived entry notice (danmercede.online)

Status: implemented in this PR. Owner-merge.

## Problem

The log is append-only: entries are historical records and are not rewritten.
Some older entries describe Cosmocrat as it used to be positioned, a governance
platform whose control plane enforces policy at runtime, with a Drift Guard
component and a platform migration. Cosmocrat is now Cosmocrat OS ("Tools for
human-directed AI work", https://www.cosmocrat.ai/about). Those entries must stay
published, but no live page may present the old claims as current.

## Goal and non-goals

- **Goal:** an outdated entry can be marked archived with a banner that every
  reader sees before the entry's claim or body, on every surface that shows the
  entry, while the entry's original text stays exactly as published.
- **Non-goal:** deleting, rewording, or moving entries; changing permalinks;
  a separate archive listing; changing substrate-sourced entries (the substrate
  repo owns those).

## Domain terms

- **Archive notice:** the banner text carried by an archived entry (frontmatter
  field `archiveNotice`). Replaces informal terms like "deprecation banner" or
  "legacy label".
- **Archived entry:** any entry that carries an archive notice.

## Scenarios (tracer bullets)

1. **Author marks an entry archived.** Adding an `archiveNotice` line to an inbox
   entry's frontmatter and recompiling publishes the entry with its notice; the
   claim, implication and body are byte-for-byte unchanged. A notice that is not
   a non-empty string fails the compile (fail-closed), naming the file and field.
2. **Reader on the live feed sees the notice first.** The entry card shows the
   notice directly under the title, ahead of the claim or status fields, with any
   https URL in the notice rendered as a working link.
3. **Crawler or answer engine sees the notice first.** The baked HTML for the
   entry (feed body, per-entry page, RSS/Atom full content) carries the notice as
   a note paragraph ahead of the claim, with https URLs as links.
4. **Share card and feed reader preview lead with the notice.** The per-entry
   page description (page, Open Graph, Twitter) and the RSS/Atom summary begin
   with the notice, closed as a sentence, followed by the original lead text.
5. **Cosmocrat entries stay labelled.** Every entry that names the legacy
   Cosmocrat platform (any "Cosmocrat" mention not in the "Cosmocrat OS" form)
   carries an archive notice; the five archived Cosmocrat entries carry exactly
   `Archived log entry. Cosmocrat is now Cosmocrat OS; see https://www.cosmocrat.ai/about`.

## Constraints

- One splitter decides what is linked, shared by the live card and the baked
  HTML, so the two cannot disagree. Only `https://` URLs are linked; any other
  scheme stays text. All notice text is escaped in baked HTML.
- The baked notice is a paragraph, never a nested block that could end the
  per-entry page's prerender block early.
- No new dependencies; no change to entry ordering, permalinks, sitemap, or the
  drift gate's compared fields.

## Test seams

- Compiler: inbox read of a temp entry (scenario 1).
- Baked article HTML, per-entry page builder, feed renderers (scenarios 3, 4).
- Committed corpus guard over the ordered entries and the baked body (scenario 5).
- The live card shares the tested splitter; it is verified through the production
  build rather than a DOM test harness, which this repo does not have.

## Acceptance criteria

- Compile fails closed on a non-string or blank `archiveNotice`.
- Archived entries lead with the notice in the card, baked HTML, page/OG/Twitter
  descriptions and feed summaries; unarchived entries render exactly as before.
- No entry naming the legacy Cosmocrat platform renders without a notice.
- No archived entry is deleted or reworded; entry count is unchanged.
