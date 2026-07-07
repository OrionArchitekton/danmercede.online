---
title: "Vet the AI PR Fleet"
slug: "2026-07-07-vet-the-ai-pr-fleet"
date: "2026-07-07T14:35:00-0700"
type: "short-essay"
claim: "Merging a queue of AI-authored pull requests is not a rubber stamp. Three failure modes hide in the queue, and each needs verify-before-you-trust, not blind application."
implication: "Treat a fleet of machine-written PRs like untrusted input: gate the merge on empirical checks at three layers, not on the open-PR count going down."
tags: ["failure-modes", "execution", "systems"]
context: "execution"
---

Merging a batch of machine-authored pull requests looks mechanical until three failure modes surface in the same session.

First, contradictory contracts. Two PRs written against different base commits can encode opposite rules for the same interface. One says a source must be a clean checkout and fails closed; another assumes the source can be a loose bundle and falls through. Whichever lands first silently invalidates the other's premise. The tell is the second PR's own test failing against the newly merged base. Do not force the merge with ours or theirs. Stop and hand the design question to a human.

Second, confident false positives. A review bot can flag a high-severity bug that is not real. One insisted a shell here-string leaves a stray newline stuck to the last array element. It does not: `read` consumes that newline as the line delimiter, so the last field is clean. A ten-second empirical check settles it. Verify a finding before you apply it, because a wrong fix regresses correct code with full confidence.

Third, the fix that already exists. When a PR still shows open findings, your own automation may have committed the fix locally and then failed to push it, blocked by a repo gate on a missing dependency. Reconcile the PR head against the local branch before you touch anything, because they diverge. Adopt the existing fast-forward commit instead of re-authoring the same change from scratch.

The through line is that a fleet of AI-written PRs earns trust one verification at a time, and the checks live at three layers: cross-PR contract conflicts, bot-finding accuracy, and unpushed automation state. The merge button is the last gate, not the first.
