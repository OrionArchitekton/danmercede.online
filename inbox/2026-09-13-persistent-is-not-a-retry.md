---
title: "Persistent Is Not a Retry"
slug: "2026-09-13-persistent-is-not-a-retry"
date: "2026-09-13T07:05:00-0700"
type: "status-update"
status: "Resolved"
whatBroke: "A weekly systemd user timer lost a whole week to one killed run. It fired at wake as a Persistent=true catch-up, and 44 seconds later the WSL VM shut down: status=15/TERM. Persistent=true only re-fires a trigger that was MISSED. This one had fired, so systemd marked the week done and nothing retried until the next weekly slot. The unit also died during teardown, when systemd will not start an OnFailure job, so nothing alerted. Afterwards systemctl show reported Result=success anyway, because the new user manager had never run the unit and its ExecMainStartTimestamp was empty."
whatChanged: "Added a separate hourly catch-up timer that starts the real service only when the most recent scheduled slot never completed. The check keys to the slot, not to recency: the job advances a round-robin rotation on every run, so 'run it if it has not run lately' would have rotated to a new item every hour. It runs as ExecCondition and acts only on positive evidence. DUE runs, DONE skips, anything else exits 255 so the unit fails loudly. Verifying it surfaced a second trap: a missing ExecCondition binary is not a failure. systemd logs Skipped due to 'exec-condition' and moves on, so a guard living in a checkout you switch branches in quietly disables itself. The condition now exits 255 when the wrapper is absent."
nextStep: "Sweep every fixed-time, long-running timer on the host. This is the third time the same class lost work, and a lesson written against one job protected none of its siblings."
tags: ["failure-modes", "infra", "signal"]
context: "infra"
---
