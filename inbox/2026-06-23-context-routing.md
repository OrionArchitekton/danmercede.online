---
title: Context Routing
slug: 2026-06-23-context-routing
date: '2026-06-23T09:25:29-0700'
type: experiment-log
hypothesis: 'A coding agent can spend fewer tokens without losing quality if retrieval, cache, and tool surfaces are gated by evidence instead of injected by default.'
constraint: 'Public-safe summary only; no private infrastructure names, no client data, and every active change must stay reversible and verified.'
result: Passed
resultDetails: 'The useful pattern was not more memory by default. It was read-only recall, explicit tool allow-lists, registry freshness checks, cache proposals kept behind offline quality gates, and smoke tests that had to turn green.'
nextStep: 'Promote only the optimizations that pass the quality gate; keep semantic replay out of coding, governance, incident, and current-state answers until it earns trust.'
tags:
  - systems
  - governance
  - execution
context: systems
externalContext:
  whyItMatters: 'The useful pattern was not more memory by default. Promote only the optimizations that pass the quality gate; keep semantic replay out of coding, governance, incident, and current-state answers until it earns trust.'
  plainTermsNote: gate means a deterministic pre-execution check required before code or publishes advance.
  guideUrl: 'https://www.danmercede.com/guides/the-fail-closed-harness'
  guideLabel: 'Guide: The Fail-Closed Agent Harness on danmercede.com'
---
