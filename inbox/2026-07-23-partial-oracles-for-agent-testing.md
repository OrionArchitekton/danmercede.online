---
title: "Partial Oracles for Agent Testing"
slug: "2026-07-23-partial-oracles-for-agent-testing"
date: "2026-07-23T22:30:00-0700"
type: "short-essay"
claim: "You cannot regression-test a nondeterministic agent by demanding yesterday's exact words. The useful target is its behavioral contract: required structure, deterministic invariants, and per-field tolerance bands. Invariants run first and cannot be explained away by an LLM judge. Borderline semantic changes become an explicit flaky result, not a forced pass or fail. Legitimate evolution proposes a contract update, but a named human decides whether the boundary moves. The system under test never gets to redefine success by itself."
implication: "Agent QA needs layered partial oracles: exact rules where truth is deterministic, bounded similarity where variation is legitimate, and human authority where the contract changes. I built that pattern into Proctor and presented it in the UiPath AgentHack 2026 live finale. Architecture, quickstart, and source: https://www.danmercede.com/works/proctor/"
tags: ["systems", "governance", "execution"]
context: "systems"
---
