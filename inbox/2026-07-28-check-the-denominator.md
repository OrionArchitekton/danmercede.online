---
title: "Check the Denominator"
slug: "2026-07-28-check-the-denominator"
date: "2026-07-28T09:15:00-0700"
type: "experiment-log"
hypothesis: "Two independent-looking surfaces both reporting a large pile of stalled work are corroborating a real signal that deserves attention."
constraint: "Read-only probe of the underlying list before acting; compare each surface's predicate, not just its headline count."
result: "Failed"
resultDetails: "One surface flagged 13 of 13 in-flight items as stale. It fires on 100% of its population, so it ranks nothing and cannot separate an abandoned item from one claimed four minutes ago. The second surface counted 10, because it measured a different predicate over an overlapping set. The two were never measuring the same quantity, so their apparent agreement was not corroboration at all."
nextStep: "Before treating any 'N items are stale, failing, or degraded' surface as a priority signal, get the denominator. If N equals the population, that is a definition firing, not a measurement."
tags: ["signal", "failure-modes", "systems"]
context: "signal"
externalContext:
  whyItMatters: "Outside our local build environment, \"Check the Denominator\" captures a portable lesson for engineering teams: Two independent-looking surfaces both reporting a large pile of stalled work are corroborating a real signal tha.... Any engineering team running automated workflows encounters this pattern once scripts move from demos into continuous production."
  plainTermsNote: "Engineering log note translating an internal workflow observation into portable production rules for any agent or software team."
  guideUrl: "https://www.danmercede.com/guides/agent-built-infrastructure-you-can-trust"
  guideLabel: "Guide: Agent-Built Infrastructure You Can Trust on danmercede.com"
---
