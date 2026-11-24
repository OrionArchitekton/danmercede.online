---
title: failclosed Is Public
slug: 2026-06-09-failclosed-is-public
date: '2026-06-09T18:30:00+0000'
type: status-update
status: Active
whatChanged: 'Open-sourced failclosed — the authority gate applied to the merge boundary — alongside the supporting repos. The deterministic gate, the parser, the receipt: all public.'
whatBroke: Nothing. The model behind the gate is replaceable; the gate is what shipped.
nextStep: 'The long-form on why, then a feed cut that drives back to the repo.'
tags:
  - governance
  - signal
  - execution
context: governance
externalContext:
  whyItMatters: 'The deterministic gate, the parser, the receipt: all public. Nothing.'
  plainTermsNote: fail-closed means blocks the action on missing proof or error instead of silently continuing; gate means a deterministic pre-execution check required before code or publishes advance; receipt means an immutable record tying an action to its verified inputs and exact outcome.
  guideUrl: 'https://www.danmercede.com/guides/done-needs-a-receipt'
  guideLabel: 'Guide: Why Done Needs a Verification Receipt on danmercede.com'
---

