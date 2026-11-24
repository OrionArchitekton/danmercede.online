---
title: "The Gate's First Adversary Is Its Own Writer"
slug: "2026-04-22-the-gates-first-adversary-is-its-own-writer"
date: "2026-04-22T18:15:00+0000"
type: "working-note"
content: "Added fail-fast-before-write plus an exclusive lock to the promote and lint tools after watching a bad write leave an orphaned temp file. The threat model fixates on outside callers; the likelier corruption is the system's own second concurrent write, validating after it has already touched state."
openQuestion: "Where else in the pipeline do we mutate before we validate?"
tags: ["systems", "execution", "failure-modes"]
context: "execution"
externalContext:
  whyItMatters: "Outside our local build environment, \"The Gate's First Adversary Is Its Own Writer\" captures a portable lesson for engineering teams: Added fail-fast-before-write plus an exclusive lock to the promote and lint tools after watching a bad write lea.... Any engineering team running automated workflows encounters this pattern once scripts move from demos into continuous production."
  plainTermsNote: "gate means a deterministic pre-execution check required before code or publishes advance; prompt-boundary limit means model instructions can advise behavior, whereas only code checks at the tool boundary enforce it."
  guideUrl: "https://www.danmercede.com/guides/the-fail-closed-harness"
  guideLabel: "Guide: The Fail-Closed Agent Harness on danmercede.com"
---

