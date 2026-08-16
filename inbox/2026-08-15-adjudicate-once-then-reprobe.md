---
title: "Adjudicate Once, Then Re-Probe"
slug: "2026-08-15-adjudicate-once-then-reprobe"
date: "2026-08-15T19:15:00-0700"
type: "experiment-log"
hypothesis: "When an autonomous review sweep re-raises the same declined finding class every cycle, writing the adjudication down once, with premises a later pass can re-verify live, turns every subsequent apply pass into a minutes-long re-probe instead of a full re-derivation."
constraint: "A 6-hourly multi-engine review sweep on a PR that is deliberately blocked on a sibling draft PR (merge-order: the artifacts it adds depend on a writer that only exists in the draft). Max one fix cycle per PR, no force-push, and the wrong fixes are attractive: regenerate the artifacts under the old schema, or duplicate the draft's writer inline."
result: "Passed"
resultDetails: "Six consecutive sweep apply passes hit the same finding class (three engines, oscillating between 2 and 6 findings per run, all one defect). Each pass re-verified two premises live before declining: the blocking PR is still an open draft, and the target branch head is unchanged. All six declined cleanly, pushed nothing, and never ran the tool that would have stripped the contested fields. The record also names the two wrong fixes explicitly, which is what keeps a fresh agent from burning its one fix cycle on either."
nextStep: "The record self-invalidates by construction: the day the blocking PR lands, the premise re-probe fails, and the note itself says the right move becomes regenerating through the landed path."
tags: ["execution", "governance", "failure-modes"]
context: "execution"
---
