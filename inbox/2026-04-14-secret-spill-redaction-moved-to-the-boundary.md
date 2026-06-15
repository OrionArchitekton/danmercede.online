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
---

