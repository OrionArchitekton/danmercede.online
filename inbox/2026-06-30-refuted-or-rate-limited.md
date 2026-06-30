---
title: "Refuted or Rate Limited"
slug: "2026-06-30-refuted-or-rate-limited"
date: "2026-06-30T08:14:36-0700"
type: "experiment-log"
hypothesis: "When a multi-agent research run reports 'all claims refuted (0-0 votes)', re-verifying with a few source-grouped first-hand reader agents beats re-running N adversarial refuters per claim."
constraint: "Same claim set and model; the verify phase had just died on transient rate limits (every claim scored 0-0, every voter errored)."
result: "Passed"
resultDetails: "The per-claim refuter design fired roughly 75 agents within seconds and they all hit a transient 429, manufacturing a false 'all refuted, inconclusive'. Re-running verification as about 8 source-grouped readers (one agent per source URL, each reading its source and checking all of that source's claims at once) finished clean with zero rate-limit deaths and was more accurate: each reader judged claims with the full source in context instead of seeing one claim blind."
nextStep: "Treat a 0-0 'refuted' as a failures-block smell, not a verdict. Default the verify fan-out to source-grouped readers, and bucket any errored or rate-limited lens as PENDING to re-run independently, never silently as 'refuted'."
tags: ["failure-modes", "systems", "signal"]
context: "failure-modes"
---
