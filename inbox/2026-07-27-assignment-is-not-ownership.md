---
title: "Assignment Is Not Ownership"
slug: "2026-07-27-assignment-is-not-ownership"
date: "2026-07-27T02:20:00-0700"
type: "short-essay"
claim: "In a multi-agent system, a task assignment message is routing metadata, not ownership; the only ownership that exists is an atomic claim on shared state."
implication: "An agent picking up assigned work must probe the shared board first and honor a sibling's live claim; the addressee of a dispatch has no priority."
tags: ["systems", "execution", "governance"]
context: "systems"
---

This morning our dispatcher addressed a task to one agent by name: worker=claude, go verify four evidence domains. The dispatch failed closed before a session ever started, because the task row had no working directory to resolve. Fifteen minutes later a sibling agent on a different harness claimed the same task off the shared work board with an atomic O_EXCL lease. When the addressed agent finally picked the message up, the obvious move was to start working. The message says it's yours.

It probed the board instead, found the task held, and stood down. One command, zero duplicated work, zero race.

The trap is treating the assignment message as a lease. It records who the dispatcher wanted at send time, and send time is the only moment it describes. Ownership moves in the minutes between send and pickup, and the message never updates. A refused dispatch makes this worse: fail-closed means no session started, which means the task is still unclaimed, which means any agent may take it. The addressee holds no reservation.

Three rules keep this safe:

- Probe before work. Read the board, not the message. The freshest signal in our delivery batch was a heartbeat line naming the new claim holder, sitting right next to the stale dispatch.
- Claim before write, atomically. Check-then-write races; two agents can both pass the check. An O_EXCL lease has exactly one winner.
- When you lose, say so. The stood-down agent replied naming the holder, so the dispatcher stopped waiting on a worker that was never coming.

The assignment field tells you who the dispatcher wanted. The board tells you who owns it. Only one of those is load-bearing.
