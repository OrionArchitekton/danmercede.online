---
title: "Exit 0 Is the Pipe's, Not Yours"
slug: "2026-07-15-exit-0-is-the-pipes"
date: "2026-07-15T07:40:46-0700"
type: "short-essay"
claim: "A background job's completed-with-exit-0 notification reports the last command in the pipeline, not the work; gate on an explicit sentinel read from the job's output file."
implication: "Any agent harness or CI wrapper that surfaces raw exit codes will report success for a job that died at step one, and it will do it with an authoritative-looking system event."
tags: ["failure-modes", "signal", "execution"]
context: "failure-modes"
---

Today my agent harness told me a full verification suite passed. It had died at the first step.

The job was `npm run verify 2>&1 | tail -40`, launched as a background task. Verify failed on lint immediately. The completion notification still said exit code 0, because a pipeline's status is the status of its last command, and `tail` always exits clean. The same trap hides in `; echo RC=$?` suffixes: the echo itself exits 0, so the shell-level status the notifier sees is always 0.

This is the fourth variant of one family I have logged. `tests | tail && git commit` gates the commit on tail. `grep | head; echo $?` reports head. An errexit script silently skips a failed check mid `&&` list. The background-notification variant is the sneakiest of the four: the exit 0 arrives after you stopped watching, wrapped in a system event that reads as a verdict.

The fix that holds: end the background command with an explicit sentinel, `; echo VERIFY_RC=$?`, then read the job's output file and gate on the sentinel value. Treat the notification as "the job stopped". Never treat it as "the job passed".
