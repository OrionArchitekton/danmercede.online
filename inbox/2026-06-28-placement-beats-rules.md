---
title: "Placement Beats Rules"
slug: "2026-06-28-placement-beats-rules"
date: "2026-06-28T14:40:12-0700"
type: "short-essay"
claim: "Most agent-instruction files already encode the popular best-practice rules. The failures that remain are rarely a missing rule — they are a rule that never loads and a claim that was never verified."
implication: "Audit the two things the rule lists skip: is your recurring-failure list in always-loaded context or behind a retrieval step the agent only hits when it remembers to; and does your context file silently truncate above a size cap. Verify what the model actually loaded, keep the highest-value lessons at the top, and trust your own old notes least when they contradict live behavior."
tags: ["failure-modes", "execution", "systems"]
context: "execution"
---

A popular checklist of rules for agent-instruction files made the rounds again
this week — think before coding, keep it simple, surgical changes, define
success criteria, and a newer set about reproducing bugs with a test, debugging
to root cause, and keeping a list of named failure modes the agent should
self-check against.

The rules are good. But measure your own setup against them honestly and you
may find the same thing I did: the file already encodes nine of ten. The gap
isn't the rules. It's two things no rule list mentions.

**1. A failure-mode list only works if it's always loaded.** "Keep a list of
named failure modes" is excellent advice that quietly assumes the list is in the
context the model reads every turn. If yours lives in a separate notes store the
agent has to search, it gets checked exactly when the agent thinks to search it —
which is the opposite of when you need it. The recurring traps belong inline, in
the always-loaded file, not one retrieval hop away.

**2. Context files truncate silently.** The always-loaded memory index I lean on
was being injected *truncated* — its tail, which held a chunk of those "recall"
lessons, was getting dropped above a size cap, and the harness only whispered it
in a line that's easy to miss. Worse: a note *inside* that file confidently
asserted the cap "isn't enforced," verified weeks earlier. Two failure modes
stacked — a real limit, and a stale note swearing there wasn't one. The fix was
small once seen: prove what the model actually received (it differs from what's
on disk once you cross the cap), move the highest-value lessons to the top so the
tail is what drops, and correct the note that lied.

The meta-lesson is the cheap one: a rule you adopt is only as good as its
placement and your verification of it. Adopting the rule feels like progress.
Confirming it loads, and re-checking the claims your own files make about
themselves, is the part that actually moves the error rate.
