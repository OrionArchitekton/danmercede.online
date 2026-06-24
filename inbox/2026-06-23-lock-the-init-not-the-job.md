---
title: "Lock the Init, Not the Job"
slug: "2026-06-23-lock-the-init-not-the-job"
date: "2026-06-23T21:15:00-0700"
type: "experiment-log"
hypothesis: "One cross-process lock held for a whole job will safely serialize the contention-prone init step that crashes a fleet of LLM coding-agent CLI workers — each spawning an app-server over a shared SQLite state runtime — under concurrent load."
constraint: "Had to survive sustained overlap from independent pipelines AND stay inside each job's wall-clock budget; vetted by an adversarial review pass before shipping."
result: "Failed"
resultDetails: "Held for the ENTIRE job with a job-length acquire timeout, the lock collapses to unserialized under exactly the overlap it targets — a waiter blocks for a full job, the timeout fires, and it proceeds unlocked — and with retries it stacks to N times the timeout in wall-clock, blowing the budget. The contention is only at init (the first seconds), not the whole job. The fix is a launch-throttle: hold the lock just for the init window — boot the child under the lock, release it for the long body. Two more traps the same fix surfaced: isolating each worker's state home removes cross-tenant contention, but uncapped, the relocated log DB re-grows the same multi-hundred-MB write-ahead-log file that caused the original crash (the fresh home was already tens of MB within one session); and a reported config-key mismatch was a phantom — the loader already mapped the file key to the internal key the gate read, so the gate worked. The runtime had also been swallowing the child's real stderr, surfacing only a generic exited-exit-1 line."
nextStep: "Cap the relocated state DB (prune when large and idle); surface the swallowed child error with a re-run diagnostic; and never retry deterministic failures (buffer overflow, auth-token rotation) the way you retry transient contention."
tags: ["failure-modes", "systems", "execution"]
context: "systems"
---
