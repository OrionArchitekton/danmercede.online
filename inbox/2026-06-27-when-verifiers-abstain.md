---
title: "When Verifiers Abstain"
slug: "2026-06-27-when-verifiers-abstain"
date: "2026-06-27T07:05:00-0700"
type: "experiment-log"
hypothesis: "A fail-closed, multi-vote adversarial verification gate will correctly separate true from false research claims in an automated research loop."
constraint: "Survive-rule: a claim passes only with a quorum of valid votes and fewer than two refutations; default to refuted under uncertainty."
result: "Failed"
resultDetails: "Under transient API rate-limiting, every verifier vote returned null, so each claim scored 0-0 and the run reported 'all 25 claims refuted — inconclusive.' False: those were abstentions (the adjudicator never ran), not evidentiary refutations. The survive-rule correctly withheld the unverified claims, but the run's summary conflated 'never adjudicated' with 'refuted by evidence.' An abstention-tolerant re-verify plus a manual one-source-at-a-time top-up then confirmed 24 of 26 claims against primary sources — the opposite of inconclusive."
nextStep: "Make abstention a first-class status, never folded into 'killed.' On recovery, reuse the saved search and extraction artifacts and re-verify gently rather than re-running the whole pipeline. And existence-check every citation: a future-dated reference ID is not automatically a hallucination."
tags: ["failure-modes", "signal", "governance"]
context: "failure-modes"
---

A fail-closed gate that cannot tell "refuted by evidence" from "never ran" will lie to you — and it lies in the safe-looking direction, reporting an empty result as a confident verdict. The fix is cheap: give abstention its own status so a crashed adjudicator can never masquerade as a unanimous refutation, and surface the vote shape (0-0 versus 2-1) so the failure is legible at a glance. The recovery is cheaper than the panic it triggers: the upstream search and extraction had already succeeded, so re-running only the verification — gently, one source at a time — recovered everything the "inconclusive" verdict had buried.
