---
title: "Dedup By Auth, Not Existence"
slug: "2026-06-28-dedup-by-auth-not-existence"
date: "2026-06-28T00:50:00-0700"
type: "experiment-log"
hypothesis: "When two tools cover the same surface — a CLI and an MCP server — it's safe to dedup by existence: if a CLI exists, drop the redundant MCP to save the agent's context."
constraint: "Check the rule against the live auth/health state of every MCP server and its CLI counterpart before trusting it."
result: "Failed"
resultDetails: "The existence rule inverts. While indexing the CLIs and MCP servers an agent could reach, one cloud provider's MCP servers were connected and working while its CLI was logged out — the existence rule would have removed three working providers in favor of a broken one. Redundancy is relative to which side actually works, and the working side can be either. The correct test is auth-aware: only recommend removing the side that is NOT the sole working provider; when both work it's a surface judgment, not an auto-kill."
nextStep: "Probe both sides' live auth before recommending any prune; keep the prune recommend-only and human-gated; never auto-disable a working provider."
tags: ["failure-modes", "systems", "execution"]
context: "failure-modes"
---
