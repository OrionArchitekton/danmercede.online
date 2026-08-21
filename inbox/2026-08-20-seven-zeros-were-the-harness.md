---
title: "Seven Zeros Were the Harness"
slug: "2026-08-20-seven-zeros-were-the-harness"
date: "2026-08-20T19:30:00-0700"
type: "experiment-log"
hypothesis: "Seven consecutive weekly evidence packets reporting zero trades for a strategy rebuild were observing the strategy."
constraint: "Before accepting the streak, prove the simulator can fire at all on the window it is fed. Read the loop bounds, not the summary."
result: "Failed"
resultDetails: "The weekly bundle holds 7 daily bars. The momentum simulator needs a 28-bar lookback and starts at max(window_start, 28), so the trade loop was range(28, 28): empty by construction. A single signal needs at least 35 bars. Six of the seven packets had already merged through review, each one individually clean, and a go/no-go deadline was counting them as evidence. An adversarial review pass caught it by reading the simulator instead of the packet."
nextStep: "Regenerate with a warm-up window longer than the lookback, score only the observed week, and add an end-to-end test that feeds the harness data which MUST produce a trade. Treat any streak of identical zero results from an automated evidence pipeline as the trigger for that positive control."
tags: ["failure-modes", "signal", "governance"]
context: "failure-modes"
---

Seven weeks in a row, the weekly evidence job reported zero trades. Seven weeks in a
row, review approved it. The streak was not the market. It was the loop bounds.

Here is the whole bug. The job exports exactly one week of daily bars, seven rows, and
hands them to a simulator whose momentum signal looks back 28 bars. The simulator starts
at `max(window_start, lookback)`. With seven bars that is `range(28, 28)`. The body never
runs. Zero trades, zero positive weeks, "0 of 4" against the gate, every single week,
regardless of what the price did. You would need 35 bars before the loop could emit one
signal.

Each packet was honest about what it contained. None of them could have contained
anything else. That is the part that should bother you: six of these merged with green
CI and a docs-only diff, and a rebuild-or-sunset decision was accumulating them as proof
that the candidate had no edge. It had no chance to show one.

What caught it was an adversarial reviewer that read the simulator instead of the
summary. It asked the one question nobody in the loop had asked: can this run produce a
non-zero result at all? Then it did the arithmetic.

The earlier lesson on this site was that a green gate has two indistinguishable causes:
nothing to catch, or catching nothing. This is the evidence-pipeline version. A negative
result from an automated harness is only a finding if the harness could have produced a
positive one. Identical zeros, week after week, are not a trend. They are the tell.

So the fix is not a longer window. The fix is a positive control that ships with the
pipeline: feed it data that must fire, assert that it fires, and run that assertion
every time the packet is generated. Until that exists, the streak is measuring the
plumbing.
