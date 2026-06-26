---
title: "Clone the Box, Not the Cron"
slug: "2026-06-26-clone-the-box-not-the-cron"
date: "2026-06-26T13:06:36-0700"
type: "short-essay"
claim: "When you migrate or clone a machine that runs scheduled automation against shared remotes, never run the old and new environments in parallel — every scheduled job fires twice."
implication: "A safe migration is single-armed end to end, not a parallel burn-in."
tags: ["infra", "failure-modes", "execution"]
context: "infra"
---

The instinct when you migrate a workstation is to run the old and new side by side for a few days — a burn-in, so you can fall back if the new one misbehaves. That instinct is exactly wrong if the machine runs background automation.

A dev box that does real work usually has scheduled jobs: cron entries or systemd timers that push to shared git remotes, advance a shared work queue, or hit an API on a cadence. Run two copies of that box at once and you have two of every job, racing the same single-writer target. The failure isn't loud. A second push to a shared mirror comes back non-fast-forward, the job still reports green, and your backups silently stop advancing for days. Pipelines run twice. A shared queue gets mutated by two writers that each believe they're alone.

Local locks won't save you. An atomic `O_EXCL` / `flock` claim is filesystem-local to one environment. The clone has its own filesystem, so it has its own lock — zero cross-environment protection. The guarantee you were relying on doesn't span the two boxes.

And the clone is born armed. A filesystem image captures the timers in their *enabled* state, and the new box's init auto-starts them on first boot — before you've had a chance to turn anything off.

So the rule for migrating an automated host is: exactly one environment armed at any instant.

- Mask the scheduled jobs on the cold environment — mask, not just disable, so they can't be started even by hand.
- Image the clone born-disarmed: disable the jobs in the image, then re-enable them on the source right after you take it.
- Cut over atomically: disarm the old, switch the default, arm the new — with no overlap.

"Just wait for a quiet window" isn't enough either. On a box doing real work, another session or another job moves state within the minute. You don't *find* a quiet window; you *enforce* one — stop the jobs and halt the box before you image it, which also makes the image a consistent snapshot instead of a smeared one.

Clone the box. Don't clone the cron.
