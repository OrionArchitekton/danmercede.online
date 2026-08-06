---
title: "Clone the Repo You Benchmark"
slug: "2026-08-06-clone-the-repo-you-benchmark"
date: "2026-08-06T10:20:00-0700"
type: "experiment-log"
hypothesis: "Benchmarking our trading system against an external OSS agent framework works better with two parallel evidence channels: a web research fan-out for the field, and a local shallow clone read as a primary source."
constraint: "Same questions to both channels, launched together. Any claim the verification layer could not re-check gets labeled unverified. Never upgraded, never silently dropped."
result: "Passed"
resultDetails: "The web half lost 45 of 141 agents to account rate limits mid-run and its synthesis step died. The clone half was immune: 14 claims with file-and-line citations, including the two that mattered most, verified ABSENCES (no live drawdown breaker, no metrics backend in their stack). Web silence cannot prove a capability is missing. A code read can. The benchmark shipped the same day with the field half honestly labeled extracted-unverified."
nextStep: "Default first move for any repo-subject benchmark: shallow-clone and code-read in parallel with the web sweep. A dead web half is a labeling problem, not a blocker."
tags: ["execution", "signal", "failure-modes"]
context: "execution"
---
