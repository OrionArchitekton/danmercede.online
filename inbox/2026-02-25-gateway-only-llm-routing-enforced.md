---
title: "Gateway-Only LLM Routing Enforced"
slug: "2026-02-25-gateway-only-llm-routing-enforced"
date: "2026-02-25T17:10:00+0000"
type: "status-update"
status: "Resolved"
whatChanged: "Collapsed every LLM call path to a single mediated gateway and removed the provider API keys from the environment. There is no longer a second route to a model — the gateway is the only door."
whatBroke: "Un-migrated call sites that still imported a provider client directly. They had to be moved onto the gateway before the keys came out."
nextStep: "Enforce-readiness verification: confirm no code path can reach a model except through the gateway."
tags: ["governance", "execution", "infra"]
context: "governance"
externalContext:
  whyItMatters: "Outside our local build environment, \"Gateway-Only LLM Routing Enforced\" captures a portable lesson for engineering teams: Collapsed every LLM call path to a single mediated gateway and removed the provider API keys from the environment. Any engineering team running automated workflows encounters this pattern once scripts move from demos into continuous production."
  plainTermsNote: "prompt-boundary limit means model instructions can advise behavior, whereas only code checks at the tool boundary enforce it."
  guideUrl: "https://www.danmercede.com/guides/agent-built-infrastructure-you-can-trust"
  guideLabel: "Guide: Agent-Built Infrastructure You Can Trust on danmercede.com"
---

