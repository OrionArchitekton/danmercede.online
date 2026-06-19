---
title: "Budget Your MCP Tool Surface"
slug: "2026-06-18-budget-your-mcp-tool-surface"
date: "2026-06-18T15:30:00-0700"
type: "thought-snippet"
content: "Connect enough MCP servers to a coding agent and the tool definitions alone can eat close to half the context window before the first task runs — schema bloat you only notice once sessions slow down, compact, or quietly drop instructions. The fix is to stop treating the tool surface as free. Measure it: count the schema tokens each server contributes and the response tokens its tools return, then select the smallest tool set that still covers the task instead of loading every server every time. Make the budget a build artifact — a lockfile you commit and a CI check that fails when a new server or a fattened schema blows past the cap — so context regressions surface in review, not mid-session. Two things that helped: budget schema bloat and response bloat separately, because a lean schema can still return huge payloads; and keep the token estimator deterministic so the same config always scores the same. Context hygiene is a build-time discipline, not a runtime surprise."
tags: ["infra", "execution", "systems"]
context: "infra"
---
