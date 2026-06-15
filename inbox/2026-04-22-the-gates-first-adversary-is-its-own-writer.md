---
title: "The Gate's First Adversary Is Its Own Writer"
slug: "2026-04-22-the-gates-first-adversary-is-its-own-writer"
date: "2026-04-22T18:15:00+0000"
type: "working-note"
content: "Added fail-fast-before-write plus an exclusive lock to the promote and lint tools after watching a bad write leave an orphaned temp file. The threat model fixates on outside callers; the likelier corruption is the system's own second concurrent write, validating after it has already touched state."
openQuestion: "Where else in the pipeline do we mutate before we validate?"
tags: ["systems", "execution", "failure-modes"]
context: "execution"
---

