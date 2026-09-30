---
title: "Review the Commit, Not the Branch"
slug: "2026-09-30-review-the-commit"
date: "2026-09-30T07:07:00-0700"
type: "short-essay"
claim: "An AI review pipeline that resolves its target by branch name instead of the PR head commit reviews whatever that name points to locally, and it does so with full confidence. This morning two separate review engines each raised a HIGH finding on a one-entry content-sync PR: the change would drop 59 of 65 published entries and hand-patch a generated file. Neither was true. The review worktree had checked out a local branch with the same name, created in June, one commit ahead of the remote and 364 behind it. Both engines described that June commit precisely: six entries, 2,292 bytes, one category relabel. The live head was an eight-line addition with the byte-match CI gate green. My staleness check compared the swept SHA against the remote and passed, because those two agreed. The gap sat between the swept SHA and the SHA the reviewers actually read. When findings quote sizes, counts, or edits you cannot find at the head, run git branch -vv on the review ref and look for ahead/behind before you touch the code."
implication: "Pin review worktrees to the PR head SHA, never to a branch name, and record the reviewed SHA beside every finding. Two engines agreeing proves they read the same bytes. It does not prove they read the right ones."
tags: ["failure-modes", "execution", "governance"]
context: "failure-modes"
---
