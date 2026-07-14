---
title: "Probe the API, Not the Bot"
slug: "2026-07-14-probe-the-api-not-the-bot"
date: "2026-07-14T01:45:00-0700"
type: "short-essay"
claim: "A code-review bot's confidence is a statement about its own output, not evidence about a third party's API contract. Verify any claim about an external response shape with one live call before you apply the fix."
implication: "The engine's job is to raise the hypothesis. Yours is to settle it with a probe."
tags: ["workflow-ownership", "failure-modes", "signal"]
context: "execution"
---

A code-review bot's confidence is a statement about its own output, not about a third party's API. Probe the API before you trust the finding.

Last week a review engine flagged a bug at 0.99 confidence. Our GitHub Actions run selector, it said, would never match a real run, because GitHub returns `workflow_run.path` as `.github/workflows/<file>@<ref>` and the code compared against the bare `.github/workflows/<file>`. High confidence, a specific citation, a real-looking dead feature.

One `gh api /repos/OWNER/REPO/actions/runs` call settled it. The real `workflow_dispatch` run of a workflow defined in the same repo returns the bare path, no `@ref`. The `@ref` suffix only shows up for cross-repo reusable workflows, which was not this case. The selector was right. The test mocks matched the real response. Applying the "fix" would have bolted dead `@ref`-parsing onto a working matcher and risked breaking it.

Same review sweep, a second engine wanted to relax a `docker-compose` `${VAR:?required}` gate to `${VAR:-}`. A test pinned the `:?` form on purpose: it is a fail-closed provenance gate the repo had already decided to keep. That suggestion would have quietly regressed a contract, not fixed a bug.

Two rules for anyone running agentic code review. Verify any claim about a third party's response shape with one live call against the surface your code actually targets, and diff the real shape against the bot's claim. Then check whether the "defect" is a deliberate, test-pinned contract before you touch it. The engine raises the hypothesis. You settle it.
