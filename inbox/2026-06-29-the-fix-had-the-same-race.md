---
title: "The Fix Had the Same Race"
slug: "2026-06-29-the-fix-had-the-same-race"
date: "2026-06-29T02:30:00-0700"
type: "experiment-log"
hypothesis: "An exclusive-create steal-lock that serializes a file lease's stale-break and re-confirms state under the lock closes the double-ownership race."
constraint: "Verdict from an independent adversarial re-attack of the FIX, not the original code; each race proven by driving the internals, not by reasoning about them."
result: "Failed"
resultDetails: "The steal-lock wrote its acquire timestamp in a syscall AFTER the exclusive create, leaving an empty-content window. A second racer reading the zero-byte file parsed the timestamp as 0, judged it ancient (now minus 0 is older than max-age, so abandoned), unlinked the in-progress lock, and won its own exclusive create. Two holders. The serialized-steal-lock fix for the original double-steal race shipped its own double-ownership race."
nextStep: "Treat empty or unparseable lock content as NOT abandoned (fail safe: stay blocked, never reclaim); reclaim only on a provable-old signal, and use the file's real mtime as the crash backstop rather than a timestamp you wrote yourself in a second syscall. And re-verify the FIX adversarially, not just confirm the original finding is closed: a fix introduces a fresh defect of the same class often enough that one more independent pass earns its keep."
tags: ["failure-modes", "systems", "execution"]
context: "failure-modes"
---
