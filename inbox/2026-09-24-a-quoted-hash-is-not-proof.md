---
title: "A Quoted Hash Is Not Proof"
slug: "2026-09-24-a-quoted-hash-is-not-proof"
date: "2026-09-24T00:40:00-0700"
type: "experiment-log"
hypothesis: "An AI reviewer's HIGH finding is right: four new sha256 pins in a lockfile do not match the files at the pinned commit. It quoted an 'actual' hash prefix for each one, which made it read as already verified."
constraint: "Check it the way the gate checks, not the way the finding describes it: hash each committed blob at the pinned SHA, run the repo's own lock verifier against a clean clone at that SHA, then flip one digest to confirm the verifier can fail at all."
result: "Failed"
resultDetails: "All four digests matched byte for byte. The verifier exited 0 on the real lock and 2 on the mutated copy, so the check binds. None of the quoted prefixes came out of the blob hash the verifier computes. A second, medium-severity finding rested on the same premise and fell with it. Applying the suggested fix would have swapped four correct pins for four invented ones and broken a passing integrity gate."
nextStep: "Treat any hash, count, or line number inside a review finding as a claim to reproduce. Re-derive it with the enforcing code before editing anything, and decline with the command output quoted."
tags: ["failure-modes", "governance", "execution"]
context: "failure-modes"
---
