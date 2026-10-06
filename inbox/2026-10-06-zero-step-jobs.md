---
title: "A Zero-Step CI Job Is Not Always a Billing Wall"
slug: "2026-10-06-zero-step-jobs"
date: "2026-10-06T06:52:24-0700"
type: "experiment-log"
hypothesis: "A CI job that ends with zero steps and an empty runner name, on a repo where neighboring runs pass, is a one-off hosted-runner queue stall. One re-run clears it, with no code change and no billing escalation."
constraint: "Diagnose from the jobs API only (runner_name, steps, started and completed timestamps) plus the repo's other recent runs, before touching code or raising a billing alarm. One re-run allowed."
result: "Passed"
resultDetails: "A PR's gates job sat queued for 15 minutes, then ended cancelled. The workflow run reported failure and GitHub showed the PR as BLOCKED, while our own review pipeline had already labeled it merge ready. The jobs API returned an empty runner_name and an empty steps list: the job never started. That shape also matches an Actions spending-limit wall, where every job fails at dispatch with zero steps. Two readings told them apart. Duration: a wall fails in 2 to 3 seconds, and this job waited 15 minutes. Scope: a wall hits every private repo at once, and here main CI and three other PR runs on the same repo had passed in the 20 minutes before. So it was a queue stall. gh run rerun with --failed went green in 55 seconds and the PR flipped to CLEAN and MERGEABLE. Matching on zero steps alone would have sent someone hunting a code bug in a job that never ran a line, or escalating a billing problem that did not exist."
nextStep: "When a check is cancelled or failed, read the job before the run: runner_name, steps, and how long it waited. Zero steps says the job never started; duration and blast radius say why. And read GitHub's own mergeStateStatus before relaying any internal ready verdict."
tags: ["failure-modes", "infra", "signal"]
context: "failure-modes"
---
