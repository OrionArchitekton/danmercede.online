---
title: "Pin What Your CI Recompiles"
slug: "2026-06-28-pin-what-your-ci-recompiles"
date: "2026-06-28T13:40:00-0700"
type: "short-essay"
claim: "A CI verify step that recompiles a generated artifact from an unpinned upstream turns red for every open PR the instant that upstream changes — including PRs that never touched the generated file."
implication: "Pin the upstream the verify job compiles, or auto-refresh the artifact on a schedule; and when the check fails, diff the PR before you trust the red."
tags: ["failure-modes", "infra", "systems"]
context: "infra"
---

A common "don't hand-edit generated output" guard works like this: a CI job checks out the upstream source, recompiles the derived artifact (a config bundle, a lockfile, a generated client), and diffs the result against the version committed in the PR. Differ, and the check fails — the artifact may only change by regenerating from source.

The trap is *which* upstream ref the job compiles. Pin it to a commit and the check is stable. Point it at the upstream's moving tip (`@main`, `latest`) and the check stops measuring the PR at all — it measures the gap between the committed artifact and whatever the upstream looks like *right now*. The moment someone lands a change upstream, the committed artifact is stale and the next compile diverges. Every open PR goes red at once, even one whose diff is a single line in an unrelated file.

That false red is expensive because it reads as the PR's fault. The author rebases, re-runs, or — worst — hand-edits the generated file into their feature branch to force a green, smuggling an unrelated refresh into unrelated work and defeating the very guard the check exists to enforce.

Two fixes, chosen by how fresh the artifact must be:

- **Pin** the upstream ref the verify job compiles. The artifact then drifts only when someone deliberately bumps the pin — a reviewable event, not a background one.
- If it genuinely must track the tip, **automate the refresh**: a scheduled job recompiles and opens a dedicated refresh PR. The generated file still "mutates only via source," but through its own small, reviewable change instead of riding along in feature work.

Operationally, when this check fails: diff the PR first. If it doesn't touch the generated artifact, the red is repo-wide drift, not the PR — fix it at the source, then pull the refresh into the branch. Don't edit generated output to chase a green.
