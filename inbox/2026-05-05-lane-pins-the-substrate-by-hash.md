---
title: Lane Pins the Substrate by Hash
slug: 2026-05-05-lane-pins-the-substrate-by-hash
date: '2026-05-05T17:00:00+0000'
type: status-update
status: Active
whatChanged: 'The lane now consumes the substrate through a per-file hash lockfile — an exact attested state, not whatever is latest. A lock bump is a deliberate, reviewed event.'
whatBroke: 'Nothing — the first channel adapter ships read-only, mutation gate held closed.'
nextStep: 'Earn the right to flip the mutation gate, one verified channel at a time.'
tags:
  - systems
  - governance
  - execution
context: systems
externalContext:
  whyItMatters: 'A lock bump is a deliberate, reviewed event. Earn the right to flip the mutation gate, one verified channel at a time.'
  plainTermsNote: gate means a deterministic pre-execution check required before code or publishes advance; substrate means the canonical markdown source repository from which public sites compile; lane means an isolated publishing or execution pipeline consuming frozen source artifacts.
  guideUrl: 'https://www.danmercede.com/guides/the-fail-closed-harness'
  guideLabel: 'Guide: The Fail-Closed Agent Harness on danmercede.com'
---

