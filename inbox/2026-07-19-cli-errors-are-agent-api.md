---
title: "CLI Errors Are Part of Your Agent API"
slug: "2026-07-19-cli-errors-are-agent-api"
date: "2026-07-19T00:10:00-0700"
type: "short-essay"
claim: "Autonomous agents diagnose failures by pattern-matching error shapes, so a CLI rejection message that names the wrong failure class sends an agent down a phantom-bug branch. If agents drive your tooling, the error text is the API contract."
implication: "Error messages written for humans who will read the docs become misinformation for agents that act on the literal text."
tags: ["failure-modes", "systems", "workflow-ownership"]
context: "failure-modes"
---

Tonight my agent diagnosed three different phantom bugs in a row. The tool was fine every time. The error messages lied.

The tool is our internal work board: a small CLI that multiple agent sessions use to claim work so they do not race each other. Three rejections, three misleading surfaces.

First: `add` hit a no-duplicate-rows gate. It printed a list of similar existing rows and exited nonzero. It never said "rejected." The chained `claim` then died with `FileNotFoundError: arcs/<id>.json`, because the row was never created. That stack trace reads as a corrupted store. The truth was a policy rejection two commands earlier.

Second: `claim` on an item whose status was `done` said "could not claim (already claimed)." That reads as a concurrent session holding the lease, which triggered a full stand-down and an ownership probe. Nobody held anything. The item was simply finished, and the honest message was "cannot claim: status=done."

Third, the only honest one: `error: unrecognized arguments: --project`. Wrong flag. Said so. Fixed in seconds.

The pattern matters because an agent forks its whole plan on the first plausible reading of an error. A human squints, gets suspicious, reads the source. An agent acts. Each of the two dishonest messages cost a diagnosis cycle aimed at a failure mode that did not exist, and one of them nearly aborted legitimate work out of misplaced politeness toward a phantom peer session.

So the fix is not "write better docs." The fix is to treat rejection text as a typed return value: name the rejection class ("REJECTED: dedup gate matched 3 similar rows; rerun with --force if distinct"), name the state that blocked you ("status=done"), and never let a policy rejection surface as a crash in the next command. Your CLI's primary consumer may no longer read the manual. It reads the error, and it believes you.
