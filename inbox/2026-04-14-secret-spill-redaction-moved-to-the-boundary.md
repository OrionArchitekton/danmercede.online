---
title: "Secret Spill: Redaction Moved to the Boundary"
slug: "2026-04-14-secret-spill-redaction-moved-to-the-boundary"
date: "2026-04-14T20:05:00+0000"
type: "status-update"
status: "Resolved"
whatChanged: "Moved redaction into the normalizer's write boundary and made it fail closed on shapes it does not recognize. Nothing gets written to canon un-redacted now."
whatBroke: "A pull-request cohort leaked a live token. The old redaction enumerated known prefixes, so the first unknown shape walked straight through."
nextStep: "Structured parse over prefix lists — a prefix list is always one unknown vendor behind."
tags: ["security", "failure-modes", "infra"]
context: "infra"
externalContext:
  whyItMatters: "Outside our local build environment, \"Secret Spill: Redaction Moved to the Boundary\" captures a portable lesson for engineering teams: Moved redaction into the normalizer's write boundary and made it fail closed on shapes it does not recognize. Any engineering team running automated workflows encounters this pattern once scripts move from demos into continuous production."
  plainTermsNote: "fail-closed means blocks the action on missing proof or error instead of silently continuing; boundary means the tool or interface layer where deterministic checks override prompt intent."
  guideUrl: "https://www.danmercede.com/guides/the-fail-closed-harness"
  guideLabel: "Guide: The Fail-Closed Agent Harness on danmercede.com"
---

