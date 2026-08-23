---
title: "A 456GB Crash Dump Ate My Backups"
slug: "2026-08-23-crash-dump-ate-my-backups"
date: "2026-08-23T13:20:00-0700"
type: "status-update"
status: "Investigating"
whatChanged: "Traced this morning's failed weekly WSL export to a 456.8GB crash dump WSL2 left in Windows Temp two days earlier."
whatBroke: "The keep-2 rotation writes the new tar before deleting the oldest, so a healthy week needs roughly 3x the artifact size in free space. The dump erased that headroom and the export died with a nonzero task result while its own log stayed clean, because the log only records successes."
nextStep: "Delete the dump, rerun the export, and treat the downstream freshness alarm as the primary health signal instead of the producer's log."
tags: ["failure-modes", "infra", "signal"]
context: "failure-modes"
---

My Windows C: drive lost over 400GB in a week and I only found out because Sunday's WSL backup export failed. The culprit: an app crashed inside WSL2 on Thursday, and WSL wrote a 456.8GB process dump to %LOCALAPPDATA%\Temp\wsl-crashes\ on the Windows side. df inside the distro never sees it. Windows cleanup tools never mention it. It just sits in Temp.

The second lesson is rotation math. My export keeps the newest 2 tars and deletes the third only after the new one lands. Safe ordering, but peak demand is 3x the artifact size, and the artifact doubled in two months as the distro grew. Design-time headroom is not runtime headroom; recompute the peak against today's artifact, not the one you sized the drive for.

The failure was silent by construction. The export script appends to its log only on success, so a clean log and a dead backup look identical unless you read the scheduler's LastTaskResult. Alarm on the absence of success, never on the presence of errors.
