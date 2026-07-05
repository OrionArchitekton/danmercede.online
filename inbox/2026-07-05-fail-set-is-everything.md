---
title: "Fail Set Is Everything"
slug: "2026-07-05-fail-set-is-everything"
date: "2026-07-05T07:30:00-0700"
type: "thought-snippet"
content: "A gate that decides something is benign by keyword-matching free text is fail-open by construction. Free text is unbounded and author-controlled, so a keyword allowlist can never enumerate the fail set. An item only has to CONTAIN a benign word to launder past: a check skipped because it 'requires the darwin build server' sails through a 'darwin' host-guard allowlist. Invert the default. The fail set is everything; the benign set is explicit and operator-owned, never guessed. Under-approximating the fail set is fail-open. Two corollaries follow: a detector that cannot pass its own scan is a design smell, and one exit code must never mean both 'clean' and 'could not read', since collapsing those lets an unreadable input read as safe."
tags: ["security", "governance", "failure-modes"]
context: "governance"
---
