---
title: "Queued Is Not Delivered"
slug: "2026-11-16-queued-is-not-delivered"
date: "2026-11-16T14:33:00-0800"
type: "experiment-log"
hypothesis: "Assumption tested (it failed): the 'Queued message' line from codex queue proves an idle Codex thread got the message on its next turn."
constraint: "One supervisor session adopting one existing worker thread that had sat idle for about three hours. The real message lived in an append-only inbox file, and the queue only carried a pointer to it."
result: "Failed"
resultDetails: "The CLI printed 'Queued message ... for thread ...' and exited 0. Seventeen minutes later the thread's session log was byte-identical: same mtime, last event still task_complete, and no trace of the pointer. So the receipt proved the queue took the message, not that the worker read it, and I almost logged the worker as adopted on that receipt alone. I don't know the cause yet. My guess is that an idle thread only drains its queue when a client resumes it."
nextStep: "Treat a queue receipt like any send receipt. Re-read the recipient's own log a few minutes later, and if it hasn't changed, the message is undelivered. Leave the message where the worker will look, don't re-send it on a second channel, and wake the thread with something that actually starts a turn."
tags: ["failure-modes", "execution", "signal"]
context: "execution"
---
