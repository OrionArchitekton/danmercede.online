---
title: "Stubs Must Filter Like the API"
slug: "2026-07-12-stubs-filter-like-api"
date: "2026-07-12T09:10:00-0700"
type: "experiment-log"
hypothesis: "Green end-to-end tests over a PATH-shimmed fake curl prove a Datadog NoData preflight's query logic is safe to ship."
constraint: "Same real script under test in both rounds; only the stub's fidelity to /api/v1/query semantics changed. No live API calls, no credentials."
result: "Failed"
resultDetails: "The stub served metric points regardless of the query's from/to range. Every test stayed green while the shipped logic carried an unreachable guard: the probe's query range equaled its staleness cutoff, so the real API could never return a point old enough to trip the stale branch, and a retired producer would read as OK. Making the stub honor from (drop out-of-range points, omit a series with no in-range points, exactly what Datadog returns) turned the fail-open red in one run. A second fidelity pass, simulating rollup buckets stamped at bucket start with a deterministic full-bucket shift, exposed a boundary false-positive as well: a heartbeat 29 minutes old reads as 34 on a one-day query."
nextStep: "Stub contract upgraded: fakes must apply the API's filtering and aggregation semantics, not just its response shape, with worst-case shifts simulated deterministically (a full bucket, never a wall-clock modulo)."
tags: ["failure-modes", "execution", "systems"]
context: "failure-modes"
---
