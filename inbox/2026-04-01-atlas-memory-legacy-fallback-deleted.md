---
title: "Atlas Memory: Legacy Fallback Deleted"
slug: "2026-04-01-atlas-memory-legacy-fallback-deleted"
date: "2026-04-01T16:40:00+0000"
type: "status-update"
status: "Resolved"
whatChanged: "Deleted the bridge-mode memory fallback. The runtime executor is now required at import, and startup fails closed if it is absent or the wrong version."
whatBroke: "Anything that used to boot on the legacy path. That is the point — while a fallback exists, the new path is optional, and optional governance is not governance."
nextStep: "Shadow-soak the cutover, then watch for anything still reaching for the deleted path."
tags: ["execution", "infra", "governance"]
context: "infra"
---

