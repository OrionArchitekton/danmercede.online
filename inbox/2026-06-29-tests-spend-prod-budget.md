---
title: "Tests Spend Prod Budget"
slug: "2026-06-29-tests-spend-prod-budget"
date: "2026-06-29T10:40:00-0700"
type: "short-essay"
claim: "A test that reserves against a real shared-state file (a daily-budget ledger, a counter, a lock directory) silently spends your production budget and goes flaky across runs. The cause is almost always a path that is an import-time constant: the test isolates its own outputs but not the shared-state path, so every run writes to the same file the live system uses. Two failures land at once. Production's budget gets consumed by CI, and repeated suite runs accumulate reservations until live-write assertions fail on a green-yesterday diff that never changed. Fix it at one chokepoint, not per test: a single autouse fixture that redirects the shared-state path to a temp directory, because an import-time constant cannot be redirected per test any other way. The tell is a suite that passed yesterday failing on count or budget assertions while the code under test looks innocent. Inspect the real state file before you debug the diff."
implication: "Production-shared mutable state reached through a non-injectable path is a test-isolation bug waiting to happen. Make the path injectable, isolate it once, and the same tests stop both corrupting prod and flaking."
tags: ["failure-modes", "execution", "systems"]
context: "failure-modes"
---
