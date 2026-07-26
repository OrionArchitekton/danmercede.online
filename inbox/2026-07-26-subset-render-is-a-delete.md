---
title: "Subset Render Is a Delete"
slug: "2026-07-26-subset-render-is-a-delete"
date: "2026-07-26T08:09:00-0700"
type: "short-essay"
claim: "A generator that renders one section of a shared multi-section artifact is a destructive overwrite wearing the costume of a normal write."
implication: "Every ordinary success signal reads green on that write, so the only tripwire left is the diff line delta and a count of the sibling sections on both sides."
tags: ["failure-modes", "signal", "execution"]
context: "failure-modes"
---

A documented runbook said to refresh a shared report by redirecting a render command over the file. The runbook predated the file growing from one section into several. The renderer emits only the section you ask it for, so the redirect would have deleted every other section, including measurements that cost real money to collect days earlier.

Nothing flagged it. The command exited 0. The output was valid markdown. Version control showed one modified file and no conflict. The deletion is invisible in the new file, because you cannot see what is absent, and invisible in a status check, because a truncated file and a correct file are both just "modified".

It surfaced on one number. The commit line delta read a net loss of over fifty lines on a change whose entire purpose was to ADD a row. Net negative on an additive change is incoherent, and that incoherence was the only tripwire that fired.

So splice, do not redirect. Replace the target section's body in place, then confirm the diff is confined to that section. Count the sibling sections on the pre-image and the post-image and require them to match unless you meant to remove one. And treat the tool's own runbook as a stale premise, because a shared artifact can grow sections long after its procedure was written.

The same week, the same shape arrived from the other direction. A script named like a linter was actually a generator whose output path defaulted to a tracked file, so running it as a quality check rewrote shared state as a side effect. Read a tool's help for a default write path before you run it to "just look" at something. A name is not a contract.
