---
title: "Repo Contracts as a Fail-Closed CI Gate"
slug: "2026-03-18-repo-contracts-as-a-fail-closed-ci-gate"
date: "2026-03-18T18:00:00+0000"
type: "experiment-log"
hypothesis: "A repo-contract registry plus a CI gate that fails closed on violation will catch cross-repo boundary breaches before they merge, instead of in review."
constraint: "The gate has to fail closed — a warning nobody reads is not enforcement."
result: "Passed"
resultDetails: "Adopted the fail-closed gate plus a secret-scan template across the estate and bootstrapped the runtime as a bounded repo with its boundary declared before any code. Violations now stop at the gate."
nextStep: "Extend the contract gate to every repo, not just the new ones."
tags: ["governance", "systems", "infra"]
context: "governance"
---

