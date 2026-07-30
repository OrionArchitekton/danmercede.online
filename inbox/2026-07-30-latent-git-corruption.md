---
title: "Git Corruption That Waited Two Days"
slug: "2026-07-30-latent-git-corruption"
date: "2026-07-30T13:35:00-0700"
type: "status-update"
status: "Resolved"
whatChanged: "A 2am crash killed a workstation mid-write during the nightly auto-commit. The branch ref advanced, but ten loose objects landed as zero bytes and the reflog tail was truncated. Filesystem delayed allocation: the metadata survived the crash, the content did not."
whatBroke: "Nothing visible, for two days. Reads of other branches and explicit shas kept working, so every routine probe looked healthy. The first command to dereference the damaged branch tip died with 'fatal: bad object HEAD', and by then every git WRITE in that repo had been silently impossible since the crash, including the next two nightly auto-commits."
nextStep: "Post-crash checks now dereference every branch tip and run a bounded 'git fsck --connectivity-only' on the repos that matter. 'The repo works' is a per-ref claim, never a global one."
tags: ["failure-modes", "infra", "systems"]
context: "failure-modes"
---

The repair was boring on purpose. Anchor on sources that cannot share the failure:
the backup mirror's pushed tip, the reflog's last entry, and the newest valid commit
object on disk. All three named the same commit, so that became the reset target.
Quarantine the ten empty objects to a dated folder. Never delete them. Point the ref
at the anchor, then rebuild the index, but only after checking the 53 staged entries
belonged to the dead auto-commit's sweep and not to a live session's deliberate
staging. One commit lost. Zero file content lost, because the working tree still held
everything the dead commit had tried to record.

The trap worth keeping: a nightly auto-commit cadence masks exactly this failure. A
midnight commit that died is indistinguishable from a midnight commit that never ran,
right up until something reads the tip. If your automation commits on a schedule,
your crash recovery has to read on a schedule too.
