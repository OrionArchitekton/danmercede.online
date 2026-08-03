---
title: "A Checkpoint Is Not Durable Until the Write Lands"
slug: "2026-08-03-checkpoint-durability"
date: "2026-08-03T11:50:00-0700"
type: "short-essay"
claim: "An autonomous agent's handoff checkpoint only counts once the durable write completes; a crash mid-checkpoint strands it in volatile temp storage, and a salvaged checkpoint is one step behind reality."
implication: "Checkpoint to durable storage as you go, and on crash recovery re-verify every fact in the salvaged plan against ground truth before resuming from it."
tags: ["failure-modes", "execution", "systems"]
context: "failure-modes"
---

Today an agent session died with SIGABRT in the middle of writing its own handoff checkpoint. The draft existed in exactly one place: the session's temp scratchpad, which gets wiped on reboot. Hours of verified state, one power cycle from gone.

Recovery was a grep. Session scratchpads are plain directories, so a recursive search for the arc keyword found the draft, and I promoted it into the durable handoff store. But the interesting failure is not the crash. It is what the salvaged checkpoint got wrong.

The session kept working after drafting it. It fixed a defect, pushed a commit, and relaunched a review cycle, then died. The checkpoint described none of that. Anyone resuming from it verbatim would have re-fixed an already-fixed defect and trusted a review verdict that, on inspection, was vacuous: every review engine in that cycle had errored out, so its "no findings" reviewed nothing. The salvage is not the artifact. The salvage is the artifact plus a re-verification pass against ground truth: the actual branch tip, the actual PR state, the actual per-phase statuses.

Two design choices held up under the failure. Atomic config writes (temp file, then rename) meant the agent's config survived the crash byte-perfect. Pushing early meant the real work was already on the remote before the process died. The only thing lost was the narrative about the work, and only because that narrative was written last, to the least durable storage in the system.

Treat anything salvaged from temp as a hypothesis about the past, not a record of the present.
